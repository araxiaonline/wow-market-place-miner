import tradegoods from "./items/tradegoods.json"; 
import { minePricing } from "./data-miners/minePriceNexus";

(async () => {
    await minePricing(tradegoods, './sql/acore_world/mp_tradegoods_nexus.sql');
})(); 

