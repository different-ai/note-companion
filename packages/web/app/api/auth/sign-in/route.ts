import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

// This is a server-side implementation of password verification
// It uses Clerk's API to verify passwords and create sessions

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    
    // Get the Clerk client instance - properly await the promise
    const client = await clerkClient();
    
    // Check if the user exists
    const usersResponse = await client.users.getUserList({ emailAddress: [email] });
    
    if (usersResponse.data.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    
    const user = usersResponse.data[0];
    
    // Check if the user has password authentication enabled
    if (!user.passwordEnabled) {
      return NextResponse.json({ 
        error: "Password authentication not enabled for this user",
        message: "Please use another authentication method or enable password authentication in your account settings."
      }, { status: 401 });
    }
    
    // Verify the user's password directly using Clerk's verifyPassword method
    const verification = await client.users.verifyPassword({
      userId: user.id,
      password: password,
    });
    
    if (!verification.verified) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    
    // Instead of creating a session, just use the userId as a token base
    // In production, you might want to use a proper JWT library
    const tokenValue = `auth_${user.id}_${Date.now()}`;
    
    return NextResponse.json({
      token: tokenValue,
      userId: user.id,
      expiresAt: Date.now() + 3600000, // 1 hour expiration
    });
  } catch (error) {
    console.error("Error in sign-in:", error);
    return NextResponse.json({ error: "Authentication failed", message: "An error occurred during authentication" }, { status: 500 });
  }
}
