import { Hono } from 'hono'
import UserRouter from './routes/user'
import BlogRouter from './routes/blog';
import { verify } from 'hono/jwt';

const app = new Hono<{
	Bindings: {
		DATABASE_URL: string,
        JWT_SECRET: string
	}
}>();

// Middlewares
// app.use("/api/v1/blog/*", async (c, next) => {
//   const header = c.req.header("authorization") || "";
//   // Bearer token
//   const token = header.split(" ")[1];
  
//   // response
//   const response = await verify(header, c.env.JWT_SECRET);

//   if(response.id){
//     await next();
//   }else{
//     c.status(403);
//     return c.json({
//       status: false,
//       message: "unauthorized"
//     })
//   }
// });


// Routes
app.route("/api/v1/user", UserRouter);
app.route("/api/v1/blog", BlogRouter);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})



export default app
