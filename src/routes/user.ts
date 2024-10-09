import { Hono } from "hono";
import { withAccelerate } from "@prisma/extension-accelerate";
import { hashPassword, verifyPassword } from "../utils/hashPasswords";
import { sign } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { signUpInput, signIpInput } from "pbd-medium-common";

const UserRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

UserRouter.post("/signup", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();

    const parsed = signUpInput.safeParse(body);

    if(!parsed.success){
        c.status(411);
        return c.json({
            status: false,
            message: "Wrong Input format for Signup"
        });
    }

    const hashedPass = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPass,
      },
    });

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json({ jwt });
  } catch (error) {
    console.error("Error occurred signup:", error);
    c.json({ error });
  }
});

UserRouter.post("/signin", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();

    const parsed = signIpInput.safeParse(body);

    if(!parsed.success){
        c.status(411);
        return c.json({
            status: false,
            message: "Wrong Input format for Signin"
        });
    }
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
      cacheStrategy: { ttl: 60 },
    });

    // Verify User Existence
    if (!user) {
      c.status(403);
      return c.json({
        status: false,
        message: "User non found",
      });
    }

    // Verify User Password
    if (!verifyPassword(user.password, body.password)) {
      c.status(401);
      return c.json({
        status: false,
        message: "Entered Password is Wrong",
      });
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (error) {
    console.error("Error occurred signin:", error);
    return c.json({ error });
  }
});

export default UserRouter;
