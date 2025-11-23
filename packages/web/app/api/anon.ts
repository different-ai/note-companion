import { clerkClient } from "@clerk/nextjs/server";

// Create an anonymous user for top-up flow (when user doesn't have account)
export const createAnonymousUser = async () => {
  try {
    const client = await clerkClient();
    const user = await client.users.createUser({
      skipPasswordRequirement: true,
      skipPasswordChecks: true,
      firstName: 'Anonymous',
      lastName: 'User',
      emailAddress: [`anonymous-${Date.now()}@example.com`],
    });

    return user;
  } catch (error) {
    console.error("Error creating anonymous user:", error);
    throw error;
  }
};
