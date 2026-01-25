import React, { useState } from 'react';
import { Star, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const MenuCard = ({
    messId,
    messName,
    shortName,
    color,
    mealType,
    menu,
    overallRating,
    mealRating,
    ratingCount,
    startTime,
    endTime,
    formatTime,
    isRegistered,
    onRegister,
    onCancel
}) => {
    const [expanded, setExpanded] = useState(true);

    const displayRating = mealRating ?? overallRating;
    const hasRating = displayRating && displayRating > 0;

    // Fallback initials color if API doesn't provide color
    const initialBg = color ? `oklch(${color})` : 'var(--navy)';

    return (
        <div className="sunset-card overflow-hidden group">
            {/* Header */}
            <div
                className="p-4 flex justify-between items-center cursor-pointer relative"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Subtle colored left border indicator */}
                <div
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all group-hover:w-1.5"
                    style={{ background: initialBg }}
                ></div>

                <div className="flex items-center gap-3.5 pl-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm transition-transform group-hover:scale-105"
                        style={{ background: initialBg }}
                    >
                        {(shortName || messName || '?').charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-0.5">{messName}</h3>
                        {startTime && endTime && formatTime && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full w-fit">
                                <Clock size={11} className="text-[#EA2264]" />
                                <span>{formatTime(startTime)} – {formatTime(endTime)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {hasRating && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 bg-[#FFF4E6] px-2 py-1 rounded-lg">
                                <Star size={12} className="fill-current text-[#F78D60]" strokeWidth={0} />
                                <span className="text-sm font-bold text-[#F78D60]">
                                    {displayRating.toFixed(1)}
                                </span>
                            </div>
                            {ratingCount > 0 && (
                                <span className="text-[10px] font-medium text-gray-400 mt-0.5">{ratingCount} review{ratingCount !== 1 ? 's' : ''}</span>
                            )}
                        </div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 transition-colors">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            {expanded && (
                <div className="px-5 pb-5 pt-1">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-4"></div>

                    {menu && menu.length > 0 ? (
                        <div className="space-y-3">
                            {menu.map((menuItem, idx) => {
                                const itemName = typeof menuItem === 'string' ? menuItem : (menuItem.item || menuItem.name || 'Unknown');
                                const isNonVeg = itemName.toLowerCase().includes('chicken') ||
                                    itemName.toLowerCase().includes('egg') ||
                                    itemName.toLowerCase().includes('fish') ||
                                    itemName.toLowerCase().includes('mutton');

                                return (
                                    <div key={idx} className="flex justify-between items-start group/item">
                                        <span className="text-[15px] font-medium text-gray-700 leading-snug group-hover/item:text-[#0D1164] transition-colors">
                                            {itemName}
                                        </span>
                                        {/* Veg/Non-Veg Indicators - Clean SVG shapes */}
                                        <div className="mt-1 ml-3 shrink-0">
                                            {isNonVeg ? (
                                                <div className="w-4 h-4 border border-red-500 rounded-[4px] flex items-center justify-center bg-red-50">
                                                    <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-l-transparent border-r-transparent border-t-[5px] border-t-red-600"></div>
                                                </div>
                                            ) : (
                                                <div className="w-4 h-4 border border-green-600 rounded-[4px] flex items-center justify-center bg-green-50">
                                                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-sm font-medium text-gray-400">
                                No {mealType} menu available
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MenuCard;
