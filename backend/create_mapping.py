import pandas as pd
import json
import re

def camel_to_spaces(text):
    # e.g. "MasalaDosa" -> "Masala Dosa"
    # "PaneerButterMasala" -> "Paneer Butter Masala"
    # "Idli" -> "Idli"
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1 \2', text)
    return re.sub('([a-z0-9])([A-Z])', r'\1 \2', s1).strip()

df = pd.read_csv('../nutrients_data.csv')

mapping_list = []
for idx, row in df.iterrows():
    food_name = str(row['Food_Name'])
    frontend_label = camel_to_spaces(food_name)
    
    mapping_list.append({
        "frontend_label": frontend_label,
        "model_key": food_name,
        "calories": float(row.get('Energy_kcal', 0)),
        "protein": float(row.get('Protein_g', 0)),
        "carbs": float(row.get('Carbs_g', 0)),
        "fats": float(row.get('Fat_g', 0))
    })

with open('../ml/models/food_mapping.json', 'w') as f:
    json.dump(mapping_list, f, indent=2)

print(f"Generated {len(mapping_list)} items in food_mapping.json")
