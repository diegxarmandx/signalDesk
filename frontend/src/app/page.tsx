"use client";

import { useEffect, useState } from "react";

type apiHealth= { status: string; service : string};

export default function Home() {
  const [health ,setHealth] = useState<apiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function checkBackend(){
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        if (!response.ok) {
          throw new Error("Backend request failed");
        }
        const data: apiHealth = await response.json();
        setHealth(data);
      } catch (err) {
        setError("unable to connect to backend");
      }
    }
    checkBackend();
  }, []);

  return (
    <main className="p-10">

      <h1 className="text-3xl font-bold">

        SignalDesk AI

      </h1>

      <div className="mt-8">

        <h2 className="text-xl font-semibold">

          API Status

        </h2>

        {!health && !error && <p>Checking backend...</p>}

        {health && (

          <div>

            <p>Status: {health.status}</p>

            <p>Service: {health.service}</p>

          </div>

        )}

        {error && <p>{error}</p>}

      </div>

    </main>
  );
}
