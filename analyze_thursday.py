import os
import csv
from datetime import datetime, timedelta
import json

# Function to check if date is Thursday
def is_thursday(date_str):
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.weekday() == 3  # 3 = Thursday

# Find all 2026 Thursday files
thursday_files = []
for file in os.listdir('.'):
    if file.startswith('SENSEX_2026') and file.endswith('.csv'):
        date_str = file.split('_')[1]  # Extract date
        if is_thursday(date_str):
            thursday_files.append((date_str, file))

thursday_files.sort()

results = []

for date_str, filename in thursday_files:
    try:
        with open(filename, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        if not rows:
            continue
        
        # Group by strike_label
        strike_data = {}
        for row in rows:
            strike = row.get('strike_label', '').strip()
            option_type = row.get('option_type', '').upper().strip()
            
            if strike not in strike_data:
                strike_data[strike] = {'CALL': [], 'PUT': []}
            
            close_price = row.get('close')
            if close_price:
                strike_data[strike][option_type].append(float(close_price))
        
        # Calculate ATM straddle opening and closing
        atm_data = strike_data.get('ATM', {})
        atm_m1_data = strike_data.get('ATM-1', {})
        atm_p1_data = strike_data.get('ATM+1', {})
        
        if atm_data.get('CALL') and atm_data.get('PUT'):
            # Find minimum value (bottom) and close
            atm_values = [atm_data['CALL'][i] + atm_data['PUT'][i] for i in range(len(atm_data['CALL']))]
            atm_bottom = min(atm_values)
            atm_close = atm_data['CALL'][-1] + atm_data['PUT'][-1]
            atm_spike = ((atm_close - atm_bottom) / atm_bottom * 100) if atm_bottom != 0 else 0
        else:
            atm_bottom = atm_close = atm_spike = None
        
        # Calculate combination straddle opening and closing
        if (atm_data.get('CALL') and atm_data.get('PUT') and 
            atm_m1_data.get('CALL') and atm_m1_data.get('PUT') and 
            atm_p1_data.get('CALL') and atm_p1_data.get('PUT')):
            
            # Calculate combo values for all times
            combo_values = []
            for i in range(len(atm_data['CALL'])):
                combo_val = (atm_data['CALL'][i] + atm_data['PUT'][i] +
                            atm_m1_data['CALL'][i] + atm_m1_data['PUT'][i] +
                            atm_p1_data['CALL'][i] + atm_p1_data['PUT'][i])
                combo_values.append(combo_val)
            
            combo_bottom = min(combo_values)
            combo_close = combo_values[-1]
            combo_spike = ((combo_close - combo_bottom) / combo_bottom * 100) if combo_bottom != 0 else 0
        else:
            combo_bottom = combo_close = combo_spike = None
        
        results.append({
            'date': date_str,
            'day_name': 'Thursday',
            'atm_bottom': round(atm_bottom, 2) if atm_bottom else None,
            'atm_close': round(atm_close, 2) if atm_close else None,
            'atm_spike_pct': round(atm_spike, 2) if atm_spike is not None else None,
            'combo_bottom': round(combo_bottom, 2) if combo_bottom else None,
            'combo_close': round(combo_close, 2) if combo_close else None,
            'combo_spike_pct': round(combo_spike, 2) if combo_spike is not None else None
        })
    
    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Print results
print("\n" + "="*120)
print("2026 THURSDAY SPIKE ANALYSIS - ATM STRADDLE VS COMBINATION STRADDLE (% from Bottom)")
print("="*120)
print(f"{'Date':<12} | {'ATM Bottom':<12} | {'ATM Close':<10} | {'ATM Spike %':<12} | {'Combo Bottom':<12} | {'Combo Close':<12} | {'Combo Spike %':<14}")
print("-"*120)

for row in results:
    print(f"{row['date']:<12} | {str(row['atm_bottom']):<12} | {str(row['atm_close']):<10} | {str(row['atm_spike_pct']):<12} | {str(row['combo_bottom']):<12} | {str(row['combo_close']):<12} | {str(row['combo_spike_pct']):<14}")

# Summary statistics
if results:
    atm_spikes = [r['atm_spike_pct'] for r in results if r['atm_spike_pct'] is not None]
    combo_spikes = [r['combo_spike_pct'] for r in results if r['combo_spike_pct'] is not None]
    
    print("\n" + "="*120)
    print("SUMMARY STATISTICS")
    print("="*120)
    
    if atm_spikes:
        avg_atm = sum(atm_spikes) / len(atm_spikes)
        max_atm = max(atm_spikes)
        min_atm = min(atm_spikes)
        print(f"ATM Straddle - Avg Spike: {avg_atm:.2f}% | Max: {max_atm:.2f}% | Min: {min_atm:.2f}%")
    
    if combo_spikes:
        avg_combo = sum(combo_spikes) / len(combo_spikes)
        max_combo = max(combo_spikes)
        min_combo = min(combo_spikes)
        print(f"Combo Straddle - Avg Spike: {avg_combo:.2f}% | Max: {max_combo:.2f}% | Min: {min_combo:.2f}%")
    
    print(f"\nTotal Thursdays Analyzed: {len(results)}")
