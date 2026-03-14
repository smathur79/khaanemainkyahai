import { kavitaRecipes, SeedRecipe } from './bucket1-kavita';
import { healthyIndianRecipes } from './bucket2-healthy-indian';
import { mexicanRecipes } from './bucket3-mexican';
import { mediterraneanRecipes } from './bucket4-mediterranean';
import { asianRecipes } from './bucket5-asian';
import { indulgentRecipes } from './bucket6-indulgent';
import { smoothieRecipes } from './bucket7-smoothies';
import { gharKaKhanaRecipes } from './bucket8-ghar-ka-khana';
import { snackAndExtrasRecipes } from './bucket9-snacks-extras';

export type { SeedRecipe };

export const allSeedRecipes: SeedRecipe[] = [
  ...kavitaRecipes,
  ...healthyIndianRecipes,
  ...mexicanRecipes,
  ...mediterraneanRecipes,
  ...asianRecipes,
  ...indulgentRecipes,
  ...smoothieRecipes,
  ...gharKaKhanaRecipes,
  ...snackAndExtrasRecipes,
];
