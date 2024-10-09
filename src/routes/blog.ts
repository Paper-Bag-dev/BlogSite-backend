import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "pbd-medium-common";

const BlogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

// Fetch all posts (bulk)
BlogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const posts = await prisma.post.findMany();
    return c.json({
      status: true,
      posts,
    });
  } catch (error) {
    console.log("Error while Fetching GET|bulk: ", error);
    return c.json({
      status: false,
      message: "Couldn't find the posts you were looking for",
    });
  }
});

// Middleware for authentication
BlogRouter.use("/*", async (c, next) => {
  try {
    const authHeader = c.req.header("authorization") || "";
    const user = await verify(authHeader, c.env.JWT_SECRET);

    if (user) {
      c.set("userId", user.id as string);
      await next();
    } else {
      return c.json({
        status: false,
        message: "You are not logged in",
      });
    }
  } catch (error) {
    console.log("Error in Auth: ", error);
  }
});

// Fetch a specific blog post
BlogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const post = await prisma.post.findFirst({
      where: {
        id: id,
      },
    });

    if (!post) {
      c.status(403);
      return c.json({
        status: false,
        message: "Couldn't find the posts you were looking for",
      });
    }

    return c.json({
      status: true,
      post,
    });
  } catch (error) {
    console.log("Error while Fetching GET|/: ", error);
    return c.json({
      status: false,
      message: "Error occurred in backend while fetching post",
    });
  }
});

// Update a post
BlogRouter.put("/", async (c) => {
  try {
    const body = await c.req.json();

    // VALIDATING INPUT
    const parsed = updateBlogInput.safeParse(body);
    if (!parsed.success) {
      c.status(411);
      return c.json({
        status: false,
        message: "Wrong Input format for Update blog",
      });
    }

    const userId = c.get("userId");

    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const updatedPost = await prisma.post.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });

    return c.json({
      status: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.log("Error in PUT|/: ", error);
    return c.json({
      status: false,
      message: "Error occurred while updating post",
    });
  }
});

// Create a new post
BlogRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();

    // VALIDATING INPUT
    const parsed = createBlogInput.safeParse(body);
    if (!parsed.success) {
      c.status(411);
      return c.json({
        status: false,
        message: "Wrong Input format for Create blog",
      });
    }

    const userId = c.get("userId");

    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });

    return c.json({
      status: true,
      message: "Created post successfully",
      id: post.id,
    });
  } catch (error) {
    console.log("Error in POST|/: ", error);
    return c.json({
      status: false,
      message: "Error occurred in blog post creation",
    });
  }
});

export default BlogRouter;
