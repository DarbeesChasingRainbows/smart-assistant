import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface EventRecord {
  id: string;
  eventType: string;
  aggregateId: string;
  timestamp: string;
  payload: unknown;
}

export default function DashboardEvents() {
  const events = useSignal<EventRecord[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");
    source.onmessage = (e) => {
      const record = JSON.parse(e.data) as EventRecord;
      events.value = [record, ...events.value].slice(0, 20); // keep latest 20
    };
    source.onerror = () => console.warn("SSE connection lost");
    return () => source.close();
  }, []);

  return (
    <div class="card bg-white shadow-md p-4">
      <h3 class="card-title text-lg mb-2">Live Events</h3>
      {events.value.length === 0 ? (
        <p class="text-sm text-gray-500">Waiting for events…</p>
      ) : (
        <ul class="space-y-2 text-sm">
          {events.value.map((ev) => (
            <li key={ev.id} class="flex justify-between">
              <span class="font-mono truncate">{ev.eventType}</span>
              <span class="text-gray-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
