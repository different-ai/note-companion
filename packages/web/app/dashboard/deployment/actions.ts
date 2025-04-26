"use server";

import { db, vercelTokens } from "@/drizzle/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Vercel } from "@vercel/sdk";
import { createLicenseKeyFromUserId } from "@/app/actions";

export type DeploymentStatus = {
  projectUrl: string | null;
  deploymentUrl: string | null;
  lastDeployment: Date | null;
  modelName: string;
  visionModelName: string;
  lastApiKeyUpdate: Date | null;
  openaiKeyPresent: boolean;
  anthropicKeyPresent: boolean;
  googleKeyPresent: boolean;
  isDeploying?: boolean;
  deploymentError?: string | null;
};

export type UpdateKeysResult = {
  success: boolean;
  error?: string;
  newLicenseKey?: string;
  deployment?: DeploymentResult;
};

export type DeploymentResult = {
  id: string;
  url: string;
  createdAt: number;
  state: "BUILDING" | "ERROR" | "READY" | "CANCELED" | "QUEUED" | "INITIALIZING";
};

export type UpdateKeysInput = {
  modelName: string;
  visionModelName?: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  generateNewLicenseKey?: boolean;
};

export async function updateKeys({
  modelName,
  visionModelName,
  openaiKey,
  anthropicKey,
  googleKey,
  generateNewLicenseKey,
}: {
  modelName: string;
  visionModelName?: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  generateNewLicenseKey?: boolean;
}): Promise<UpdateKeysResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const [deployment] = await db
      .select()
      .from(vercelTokens)
      .where(eq(vercelTokens.userId, userId))
      .limit(1);

    if (!deployment) {
      return { success: false, error: "No deployment found" };
    }

    const vercel = new Vercel({
      bearerToken: deployment.token,
    });

    // Generate new license key if requested
    let newLicenseKey: string | undefined;
    if (generateNewLicenseKey) {
      const apiKey = await createLicenseKeyFromUserId(userId);
      newLicenseKey = apiKey.key.key;
    }

    // Prepare environment variables
    const envVars = [
      {
        key: "MODEL_NAME",
        value: modelName,
        type: "plain",
        target: ["production"],
      },
    ];

    if (visionModelName) {
      envVars.push({
        key: "VISION_MODEL_NAME",
        value: visionModelName,
        type: "plain",
        target: ["production"],
      });
    }

    // Only add API keys if provided
    if (openaiKey?.trim()) {
      envVars.push({
        key: "OPENAI_API_KEY",
        value: openaiKey,
        type: "encrypted",
        target: ["production"],
      });
    }

    if (anthropicKey?.trim()) {
      envVars.push({
        key: "ANTHROPIC_API_KEY",
        value: anthropicKey,
        type: "encrypted",
        target: ["production"],
      });
    }

    if (googleKey?.trim()) {
      envVars.push({
        key: "GOOGLE_API_KEY",
        value: googleKey,
        type: "encrypted",
        target: ["production"],
      });
    }

    if (newLicenseKey) {
      envVars.push({
        key: "SOLO_API_KEY",
        value: newLicenseKey,
        type: "encrypted",
        target: ["production"],
      });
    }

    // Update environment variables
    await vercel.projects.createProjectEnv({
      idOrName: deployment.projectId,
      upsert: "true",
      // @ts-ignore
      requestBody: envVars,
    });

    // Update database record
    await db
      .update(vercelTokens)
      .set({
        modelName,
        visionModelName: visionModelName || modelName,
        lastApiKeyUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vercelTokens.userId, userId));

    return {
      success: true,
      newLicenseKey: newLicenseKey,
    };
  } catch (error) {
    console.error("Error updating keys:", error);
    return {
      success: false,
      error: "Failed to update keys",
    };
  }
}

export async function getDeploymentStatus(): Promise<
  DeploymentStatus | { error: string; status: number }
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "Unauthorized", status: 401 };
    }

    const [deployment] = await db
      .select()
      .from(vercelTokens)
      .where(eq(vercelTokens.userId, userId))
      .limit(1);

    if (!deployment) {
      return { error: "No deployment found", status: 404 };
    }

    const vercel = new Vercel({
      bearerToken: deployment.token,
    });

    // Get deployment status
    let isDeploying = false;
    let deploymentError = null;

    try {
      const latestDeployment = await vercel.deployments.getDeployment({
        idOrUrl: deployment.deploymentUrl,
      });
      if (latestDeployment.status === "BUILDING") {
        isDeploying = true;
      } else if (latestDeployment.status === "ERROR") {
        deploymentError = "Last deployment failed";
      }
    } catch (error) {
      console.error("Error fetching deployment status:", error);
    }

    // @ts-ignore
    const { envs } = await vercel.projects.filterProjectEnvs({
      idOrName: deployment.projectId,
    });

    // Find environment variables
    const openaiKeyPresent = envs.some((env) => env.key === "OPENAI_API_KEY");
    const anthropicKeyPresent = envs.some(
      (env) => env.key === "ANTHROPIC_API_KEY"
    );
    const googleKeyPresent = envs.some((env) => env.key === "GOOGLE_API_KEY");
    const modelName =
      envs.find((env) => env.key === "MODEL_NAME")?.value || "gpt-4.1-mini";
    const visionModelName =
      envs.find((env) => env.key === "VISION_MODEL_NAME")?.value || "gpt-4.1-mini";

    return {
      projectUrl: deployment.projectUrl,
      deploymentUrl: deployment.deploymentUrl,
      lastDeployment: deployment.lastDeployment,
      modelName,
      visionModelName,
      lastApiKeyUpdate: deployment.lastApiKeyUpdate,
      openaiKeyPresent,
      anthropicKeyPresent,
      googleKeyPresent,
      isDeploying,
      deploymentError,
    };
  } catch (error) {
    console.error("Error fetching deployment status:", error);
    return { error: "Failed to fetch deployment status", status: 500 };
  }
}

export async function redeploy(): Promise<{
  success: boolean;
  error?: string;
  deployment?: DeploymentResult;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const [deployment] = await db
      .select()
      .from(vercelTokens)
      .where(eq(vercelTokens.userId, userId))
      .limit(1);

    if (!deployment) {
      return { success: false, error: "No deployment found" };
    }

    const vercel = new Vercel({
      bearerToken: deployment.token,
    });

    const repo = "file-organizer-2000";
    const org = "different-ai";
    const ref = "master";

    // Create new deployment
    const deploymentResult = await vercel.deployments.createDeployment({
      requestBody: {
        name: `file-organizer-redeploy-${Date.now()}`,
        target: "production",
        project: deployment.projectId,
        gitSource: {
          type: "github",
          repo,
          ref,
          org,
        },
        projectSettings: {
          framework: "nextjs",
          
          buildCommand: "pnpm build:self-host",
          installCommand: "pnpm install",
          outputDirectory: ".next",
          rootDirectory: "packages/web",
        },
      },
    });

    // Update last deployment timestamp
    await db
      .update(vercelTokens)
      .set({
        lastDeployment: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vercelTokens.userId, userId));

    return {
      success: true,
      deployment: {
        id: deploymentResult.id,
        url: deploymentResult.url,
        createdAt: deploymentResult.createdAt,
        state: deploymentResult.status,
      },
    };
  } catch (error) {
    console.error("Error redeploying:", error);
    return { success: false, error: "Failed to redeploy" };
  }
}

export async function updateKeysAndRedeploy(
  input: UpdateKeysInput
): Promise<UpdateKeysResult> {
  try {
    // First update the keys
    const updateResult = await updateKeys(input);

    if (!updateResult.success) {
      return updateResult;
    }

    // Then trigger a redeploy
    const redeployResult = await redeploy();

    if (!redeployResult.success) {
      return {
        success: false,
        error:
          "Keys were updated but deployment failed. Please try deploying again.",
        newLicenseKey: updateResult.newLicenseKey,
      };
    }

    return {
      success: true,
      newLicenseKey: updateResult.newLicenseKey,
      deployment: redeployResult.deployment,
    };
  } catch (error) {
    console.error("Error in updateKeysAndRedeploy:", error);
    return { success: false, error: "Failed to update and redeploy" };
  }
}
