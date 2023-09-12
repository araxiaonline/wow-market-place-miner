import { merge } from "lodash"; 
import { minePricing } from "./data-miners/minePriceNexus";

import recipes from "./items/blacksmith-recipes.json"; 

(async () => {
    await minePricing(recipes, './sql/acore_world/mp_mine_smithing_nexus.sql');
})(); 

