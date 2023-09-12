import { merge } from "lodash"; 
// import { minePricing } from "./data-miners/minePriceNexus";

 import { minePricing } from "./data-miners/minePricingUndermine";

import ore from "./items/mounts.json"; 
(async () => {
    await minePricing(ore, './sql/acore_world/mp_mounts_undermine.sql');
})(); 

