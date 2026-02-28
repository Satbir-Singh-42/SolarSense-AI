import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    let message = `${res.status}: ${text}`;
    try {
      const errorData = JSON.parse(text);
      const actual = errorData.error || errorData.message || text;

      // Provide user-friendly messages for image analysis errors
      if (
        actual.includes("does not show solar panels") ||
        actual.includes("solar panels or photovoltaic equipment")
      ) {
        message =
          "Please upload a solar panel image for fault detection. Rooftop images should be used for installation analysis instead.";
      } else if (
        actual.includes("does not show a rooftop") ||
        actual.includes("rooftop suitable for solar panel installation")
      ) {
        message =
          "Please upload a rooftop or building image for installation analysis. Solar panel images should be used for fault detection instead.";
      } else {
        message = actual;
      }
    } catch {
      // JSON parse failed — keep the raw message
    }

    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {};

  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    headers["x-session-id"] = sessionId;
  }

  let body: BodyInit | undefined;
  if (data) {
    if (data instanceof FormData) {
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add session ID header if available
    const headers: Record<string, string> = {};
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      headers["x-session-id"] = sessionId;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      gcTime: 10 * 60 * 1000, // 10 minutes cache (renamed from cacheTime in v5)
      retry: 1, // Allow 1 retry for better reliability
    },
    mutations: {
      retry: 1, // Allow 1 retry for mutations
    },
  },
});
