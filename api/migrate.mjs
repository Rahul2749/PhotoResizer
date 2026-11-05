import { Store } from "./store.mjs";
import { readConfig } from "./security.mjs";
import { AdminService } from "./admin.mjs";
const config=readConfig();const store=new Store(config.databaseUrl);
try{await store.migrate();await new AdminService(store,config).seed();console.log("PhotoResizeKaro payment, admin and usage schema is ready.");}catch{console.error("Migration failed. Check the separate database, role and server-only configuration.");process.exitCode=1;}finally{await store.close();}
