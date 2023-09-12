import { minePricing } from "./data-miners/minePriceNexus";
import cloth from "./items/cloth.json"; 

(async () => {
    await minePricing(cloth, './sql/acore_world/mp_cloth_nexus.sql');
})(); 

