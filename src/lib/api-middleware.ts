import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/services/api-key-service";

export interface ApiRequestResult {
  authorized: boolean;
  organizationId?: string;
  scopes?: string[];
  response?: NextResponse;
}

/**
 * Validates the API key from the Authorization header.
 * Returns the organizationId and scopes if valid.
 */
export async function authenticateApiRequest(req: NextRequest): Promise<ApiRequestResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Missing Authorization header." },
        { status: 401 }
      ),
    };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Invalid Authorization header format. Expected 'Bearer <key>'." },
        { status: 401 }
      ),
    };
  }

  const apiKey = parts[1];
  const validation = await validateApiKey(apiKey);

  if (!validation.valid || !validation.organizationId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: validation.error || "Unauthorized. Invalid API key." },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    organizationId: validation.organizationId,
    scopes: validation.scopes,
  };
}
