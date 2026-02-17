'use client';

import { Calendar, Clock } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100">
          <Calendar className="w-10 h-10 text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-500 mb-6">
          Schedule showings, open houses, inspections, and closings — all in one place. Coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Under Development
        </div>
      </div>
    </div>
  );
}
