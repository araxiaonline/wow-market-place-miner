import { minePricing } from "./data-miners/minePriceNexus";

import items from "./items/specialty_tradegoods.json"; 
(async () => {
    await minePricing(items, './sql/acore_world/mp_special_goods_nexus.sql');
})(); 

