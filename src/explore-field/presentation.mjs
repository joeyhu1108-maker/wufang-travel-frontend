// Keep the summit in the unobstructed part of the mobile stage, above the controls.
export function sceneCamera(place, { width, height, dockHeight }) {
  const compact = height < 480;
  const landscape = compact && width >= 600;
  return {
    center: place.coordinates,
    ...place.camera,
    pitch: compact ? 58 : 68,
    zoom: place.camera.zoom - (width < 360 ? .35 : .15),
    padding: {
      top: landscape ? 110 : compact ? 74 : height < 640 ? 132 : 152,
      bottom: landscape ? 36 : Math.min(dockHeight + 18, Math.max(0, height - (compact ? 190 : 290))),
      left: 20,
      right: landscape ? 360 : 52,
    },
  };
}

export function nextForecastHour(hour, length) {
  return Math.min(hour + 1, Math.max(0, length - 1));
}
