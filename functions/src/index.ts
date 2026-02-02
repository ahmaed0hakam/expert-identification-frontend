import * as functions from "firebase-functions";
import * as https from "https";
import * as http from "http";

// Backend API base URL
const BACKEND_URL = "http://81.208.165.44:8000";

/**
 * Proxy function that forwards API requests to the backend server
 * This solves the mixed-content issue by making HTTPS requests from Firebase
 * to the backend HTTP server (server-to-server communication)
 */
export const apiProxy = functions.https.onRequest((req, res) => {
  // Extract the path from the request
  // Firebase Hosting rewrites /api/* to /apiProxy?path=*
  const path = req.query.path as string || req.path.replace("/apiProxy", "");
  
  // Build the full backend URL
  const backendPath = path.startsWith("/") ? path : `/${path}`;
  const targetUrl = `${BACKEND_URL}${backendPath}`;
  
  // Parse the URL
  const url = new URL(targetUrl);
  
  // Prepare request options
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname,
    },
  };
  
  // Remove headers that shouldn't be forwarded
  delete (options.headers as any)["host"];
  delete (options.headers as any)["connection"];
  delete (options.headers as any)["content-length"];
  
  // Choose the appropriate protocol
  const requestModule = url.protocol === "https:" ? https : http;
  
  // Create the proxy request
  const proxyReq = requestModule.request(options, (proxyRes) => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // Copy status code
    res.status(proxyRes.statusCode || 200);
    
    // Copy headers
    Object.keys(proxyRes.headers).forEach((key) => {
      const value = proxyRes.headers[key];
      if (value) {
        res.set(key, value);
      }
    });
    
    // Pipe the response
    proxyRes.pipe(res);
  });
  
  // Handle errors
  proxyReq.on("error", (error) => {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Proxy error",
      message: error.message,
    });
  });
  
  // Handle request timeout
  proxyReq.setTimeout(60000, () => {
    proxyReq.destroy();
    res.status(504).json({
      error: "Gateway timeout",
      message: "Request to backend timed out",
    });
  });
  
  // Forward request body
  if (req.body && Object.keys(req.body).length > 0) {
    if (typeof req.body === "string") {
      proxyReq.write(req.body);
    } else {
      proxyReq.write(JSON.stringify(req.body));
    }
  }
  
  // Handle file uploads (multipart/form-data)
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});
