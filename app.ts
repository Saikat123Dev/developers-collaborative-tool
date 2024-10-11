import express,{request,response} from "express";
import router from "./src/routes/user.route";
const app = express();
const PORT = 3000;
app.use(express.json());


app.use("/api", router);
app.listen(PORT,()=>{
    console.log("APP is listining in the port ",PORT)
})
