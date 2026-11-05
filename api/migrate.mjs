import { Store } from "./store.mjs";
import { readConfig } from "./security.mjs";
const config=readConfig();const store=new Store(config.databaseUrl);
try{await store.migrate();console.log("PhotoResizeKaro payment schema is ready.");}catch{console.error("Migration failed. Check the separate database, role and DATABASE_URL.");process.exitCode=1;}finally{await store.close();}
