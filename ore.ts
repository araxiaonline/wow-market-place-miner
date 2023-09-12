import { merge } from "lodash"; 
import { minePricing } from "./data-miners/minePriceNexus";

import ore from "./items/ore.json"; 
(async () => {
    await minePricing(ore, './sql/acore_world/mp_ore_nexus.sql');
})(); 

