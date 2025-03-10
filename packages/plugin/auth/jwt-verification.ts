import { logger } from "../services/logger";

// Interface for decoded JWT token
export interface DecodedToken {
  exp: number;
  nbf: number;
  azp?: string;
  userId: string;
  [key: string]: any;
}

// Function to verify JWT token
export async function verifyJwtToken(
  token: string,
  publicKey: string,
  permittedOrigins: string[] = []
): Promise<DecodedToken | null> {
  try {
    // Import jsonwebtoken dynamically to avoid bundling issues
    const jwt = await import('jsonwebtoken');
    
    // Verify the token
    const decoded = jwt.default.verify(token, publicKey, { algorithms: ['RS256'] }) as DecodedToken;
    
    // Validate expiration and not-before claims
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      logger.error("Token has expired");
      return null;
    }
    
    if (decoded.nbf && decoded.nbf > currentTime) {
      logger.error("Token is not yet valid");
      return null;
    }
    
    // Validate authorized party claim if present and origins are specified
    if (decoded.azp && permittedOrigins.length > 0 && !permittedOrigins.includes(decoded.azp)) {
      logger.error(`Invalid 'azp' claim: ${decoded.azp}`);
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.error("Error verifying JWT token:", error);
    return null;
  }
}
