import { useMemo } from "react";
import { geoIdentity, geoPath } from "d3-geo";


type PathItem = { regionId: string; name: string; d: string };
export default function PrefRegionMap({
  geojson,
  completedRegionIds,
  onToggleRegion,
}: {
  geojson: any;
  completedRegionIds: Set<string>;
  onToggleRegion: (regionId: string) => void;
}) {
  const paths = useMemo<PathItem[]>(() => {
    const width = 520;
    const height = 520;

    const projection = geoIdentity()
      .reflectY(true)              // SVG座標系に合わせる
      .fitSize([width, height], geojson);

    const pathGen = geoPath(projection);

    console.log("geojson type", geojson?.type);
    console.log("features", geojson?.features?.length);
    console.log(
      "first geometry type",
      geojson?.features?.[0]?.geometry?.type
    );

    const rawPaths = (geojson.features ?? []).map((f: any) => pathGen(f) || "");
    console.log("d starts", rawPaths.map((d: any) => d.slice(0, 60)));
    console.log(
      "first points",
      (geojson.features ?? []).map((f: any) => ({
        id: f?.properties?.regionId,
        p0: f?.geometry?.coordinates?.[0]?.[0], // 最初の座標
      }))
    );


    return (geojson.features ?? [])
      .map((f: any) => {
        const d = pathGen(f);
        if (!d || d.includes("NaN")) return null;
        return {
          regionId: String(f?.properties?.regionId ?? ""),
          name: String(f?.properties?.name ?? ""),
          d,
        };
      })
      .filter(Boolean) as PathItem[];

  }, [geojson]);


  console.log("geojson type", geojson?.type);
  console.log("features", geojson?.features?.length);
  console.log(
    "first feature geometry type",
    geojson?.features?.[0]?.geometry?.type
  );



  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 520 520"
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map((p, i) => {
        const done = completedRegionIds.has(p.regionId);
        const demoFills = ["#ff6b6b", "#51cf66", "#339af0"];

        return (
          <path
            key={`${p.regionId || "noid"}-${i}`}
            d={p.d}
            fill={demoFills[i % 3]}
            stroke="#6b7280"
            strokeWidth={2}
            style={{ cursor: "pointer" }}
            onClick={() => p.regionId && onToggleRegion(p.regionId)}
          >
            <title>{p.name || p.regionId}</title>
          </path>
        );
      })}
    </svg>
  );

}