import React from 'react';
import { User } from 'lucide-react';

const ActivityFeed = () => {
    const activities = [
        { id: 1, text: "registered for Kadamba Lunch", user: "Rohan", time: "2m ago" },
        { id: 2, text: "joined the 'Foodies' circle", user: "Priya", time: "15m ago" },
        { id: 3, text: "just rated Yuktahar 5/5 🔥", user: "Amit", time: "1h ago" },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Live Activity</h3>
            <div className="space-y-0">
                {activities.map((a, i) => (
                    <div key={a.id} className="flex gap-3 items-start py-3 border-b border-white/5 last:border-0 relative">
                        <div className="absolute left-0 top-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="pl-4">
                            <p className="text-xs text-gray-300">
                                <span className="font-bold text-white">{a.user}</span> {a.text}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{a.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityFeed;
