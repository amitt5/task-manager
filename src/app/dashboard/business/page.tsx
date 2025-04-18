"use client"

import { ExternalLink, Link, Star, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

// Type declarations for Google Maps API
declare global {
    interface Window {
        initMap: () => void;
        google: {
            maps: {
                Map: any;
                places: {
                    Autocomplete: any;
                };
                ControlPosition: {
                    TOP_LEFT: number;
                };
                InfoWindow: any;
                Marker: any;
            };
        };
    }
}

export default function BusinessPage() {

    const [place, setPlace] = useState<any>(null);
    const [reviewLink, setReviewLink] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [businesses, setBusinesses] = useState<any>(null);
    const [isLinkValid, setIsLinkValid] = useState(false); // To track if link is valid

    const mapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    // Load Google Maps API dynamically
    useEffect(() => {
        getBusinesses();
        if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) return;

        const script = document.createElement("script");
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
        script.async = true;
        scriptRef.current = script;
        window.initMap = initMap;
        document.head.appendChild(script);

        return () => {
            if (scriptRef.current) {
                document.head.removeChild(scriptRef.current);
                scriptRef.current = null;
            }
            delete (window as any).initMap;
        }
    }, []);

    async function handleDeleteBusiness(id: number) {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                alert('Please sign in to delete business details');
                return;
            }

            const response = await fetch('/api/businesses', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Error deleting business:', error);
                alert('Failed to delete business. Please try again.');
            } else {
                alert('Business deleted successfully!');
                getBusinesses();
            }
        }catch (error) {
            console.error('Error saving business:', error);
            alert('Failed to save business details. Please try again.');
        }
    }
    // Handle place selection
    function handlePlaceSelected(newPlace: any) {
        setPlace(newPlace);
    }

    // Handle confirmation and generate review link
    function handleConfirm() {
        const link = `https://search.google.com/local/writereview?placeid=${place.place_id}`;
        setReviewLink(link);
        if (businessName === '' || businessName === null) {
            setBusinessName(place.name);
        }
        setIsLinkValid(true); // Enable the test link button
    }

    // Handle confirmation and generate review link
    async function handleAddBusiness() {
        try {
            if (!place?.place_id) {
                alert('Please select a business from the search results');
                return;
            }

            if (!businessName.trim()) {
                alert('Please enter a business name');
                return;
            }

            // Get the current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                alert('Please sign in to save business details');
                return;
            }

            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    business_name: businessName.trim(),
                    google_place_id: place.place_id,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save business details');
            } else {
                alert('Business details saved successfully!');
                getBusinesses();
            }   

            // const data = await response.json();
            // alert('Business details saved successfully!');
            
            // Generate review link
            // const link = `https://search.google.com/local/writereview?placeid=${place.place_id}`;
            // setReviewLink(link);
            // setIsLinkValid(true);
        } catch (error) {
            console.error('Error saving business:', error);
            alert('Failed to save business details. Please try again.');
        }
    }

    async function getBusinesses() {
        try {

            
            // Get the current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                alert('Please sign in to get your business details');
                return;
            }

            console.log('session111', session);

            const response = await fetch('/api/businesses', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to get business details');
            }

            const data = await response.json();
            setBusinesses(data);
            console.log('businesses111', data, businesses);
           
        } catch (error) {
            console.error('Error fetching business:', error);
            // alert('Failed to save business details. Please try again.');
        }
    }

    // Open the review link in a new window
    function openReviewLink(link: string) {
        window.open(link, "_blank");
    }

    

    // Initialize the Google map and autocomplete
    function initMap() {
        if (!mapRef.current || !inputRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: -33.8688, lng: 151.2195 },
            zoom: 13,
        });

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            fields: ["place_id", "geometry", "formatted_address", "name"],
        });

        autocomplete.bindTo("bounds", map);
        map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(inputRef.current);

        const marker = new window.google.maps.Marker({ map });

        autocomplete.addListener("place_changed", () => {
            const tempPlace = autocomplete.getPlace();
            if (tempPlace && tempPlace.geometry?.location) {
                map.setCenter(tempPlace.geometry.location);
                map.setZoom(17);
                marker.setPosition(tempPlace.geometry.location);
                marker.setVisible(true);
                handlePlaceSelected(tempPlace);
            }
        });
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Business Setup</h1>
                <p className="text-gray-400 mt-2">Configure your business details and review link</p>
            </div>

            <div className="bg-[#252525] rounded-lg p-6 max-w-3xl space-y-6 mb-8">
                <div>
                    <label className="block text-sm font-medium mb-2">Business Name</label>
                    <input type="text" className="w-full p-3 bg-[#333333] border border-gray-700 rounded-md" placeholder="Enter your business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Google Review Link</label>
                    <div className="flex">
                        <input
                            type="text"
                            className="flex-1 p-3 bg-[#333333] border border-gray-700 rounded-l-md"
                            placeholder="Paste your Google review link"
                            value={reviewLink}
                            onChange={(e) => setReviewLink(e.target.value)}
                        />
                        <button className="bg-[#333333] border border-l-0 border-gray-700 rounded-r-md px-4 flex items-center">
                            <Link className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                     {/* Test the link button */}
                      {isLinkValid && (
                          <div className="mt-4">
                              <button
                                  onClick={() => openReviewLink(reviewLink)}
                                  className="w-full bg-green-500 hover:bg-green-600 transition-colors text-black font-medium px-4 py-2 rounded-md"
                              >
                                  Test the Link
                              </button>
                          </div>
                      )}

                    <p className="text-xs text-gray-400 mt-2">Or find your Google business below</p>
                </div>

                {/* Place ID Finder */}
                <div className="space-y-4">
                    <input ref={inputRef} className="controls p-3 w-full bg-[#333333] border border-gray-700 rounded-md" type="text" placeholder="Search your business to get Place ID" />
                    <div ref={mapRef} className="h-64 rounded-md" />
                    <div className="text-sm text-gray-400 space-y-1">
                        {place ? (
                            <>
                                <div><strong>Place Name:</strong> {place.name}</div>
                                <div><strong>Place ID:</strong> {place.place_id}</div>
                                <div><strong>Address:</strong> {place.formatted_address}</div>

                                <div className="mt-4 space-y-2" >
                                    <button
                                        onClick={handleConfirm}
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 transition-colors text-black font-medium px-4 py-2 rounded-md"
                                    >
                                        ✅ Confirm this is my business
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-500">No place selected yet.</p>
                        )}
                    </div>
                </div>

                {/* <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4">Review Page Preview</h3>
                    <div className="bg-[#333333] rounded-lg p-6 text-center">
                        <div className="mb-4">
                            <div className="h-16 w-16 bg-gray-700 rounded-full mx-auto mb-2"></div>
                            <h4 className="font-medium">Your Business Name</h4>
                        </div>
                        <p className="text-gray-400 mb-4">We'd love to hear your feedback!</p>
                        <div className="flex justify-center gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-8 w-8 text-yellow-500" />
                            ))}
                        </div>
                        <div className="bg-[#1a1a1a] p-3 rounded-md">
                            <p className="text-sm text-gray-400">Review page preview</p>
                        </div>
                    </div>
                </div> */}

                <div className="flex justify-end pt-4">
                    <button className="bg-yellow-500 hover:bg-yellow-600 transition-colors text-black font-medium px-6 py-2 rounded-md"
                    onClick={handleAddBusiness}>
                        Add Business
                    </button>
                </div>
            </div>

              {/* Businesses Table */}
            <div className="bg-[#252525] rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">Your Businesses</h2>

                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                    <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Business Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Google Review Link</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">App Link</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-400">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {businesses?.map((business: any) => (
                        <tr key={business.id} className="border-b border-gray-700 hover:bg-[#2a2a2a]">
                        <td className="py-4 px-4">{business.business_name}</td>
                        <td className="py-4 px-4">
                            <a
                            href="#"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            onClick={() => openReviewLink(`https://search.google.com/local/writereview?placeid=${business.google_place_id}`)}
                            >
                            <ExternalLink className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">Click me</span>
                            </a>
                        </td>
                        <td className="py-4 px-4">
                            <a
                            href="#"
                            className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400"
                            onClick={(e) => e.preventDefault()}
                            >
                            <ExternalLink className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">{business.google_place_id}</span>
                            </a>
                        </td>
                        <td className="py-4 px-4 text-right">
                            <button
                            className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-[#333333]"
                            aria-label={`Delete ${business.business_name}`}
                            onClick={() => handleDeleteBusiness(business.id)}
                            >
                            <Trash2 className="h-5 w-5" />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

                {(!businesses || businesses.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                    <p>You haven't added any businesses yet.</p>
                </div>
                )}
            </div>
        </>
    );
}