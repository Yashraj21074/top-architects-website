/** Vector diagram: BUILDING → SITE → CITY. Lines draw on with the --q1/--q2/--q3 variables (set from scroll) or when `.in` is added. */
export default function SpatialDiagram() {
  const L = (d, c = '') => <path className={`sd-l ${c}`} d={d} pathLength="1" />;
  return (
    <svg className="sd" viewBox="0 0 800 460" role="img" aria-label="Diagram: building, site and city, drawn as nested plans">
      <g className="sd-g sd-g3">
        {L('M40 230 a360 190 0 1 0 720 0 a360 190 0 1 0 -720 0')} {L('M110 230 a290 150 0 1 0 580 0 a290 150 0 1 0 -580 0', 'sd-thin')}
        {L('M150 130 L650 330')}{L('M150 330 L650 130')}{L('M400 40 V420', 'sd-thin')}
        {[[150, 130], [650, 330], [150, 330], [650, 130], [400, 40], [400, 420]].map(([x, y], i) => <circle key={i} className="sd-n" cx={x} cy={y} r="5" />)}
        <text className="sd-t" x="400" y="26">CITY</text>
      </g>
      <g className="sd-g sd-g2">
        {L('M230 120 H570 L610 170 V300 L560 350 H240 L190 300 V160 Z')} {L('M230 200 H570 M230 270 H570 M330 120 V350 M470 120 V350', 'sd-thin')}
        <text className="sd-t" x="400" y="108">SITE</text>
      </g>
      <g className="sd-g sd-g1">
        {L('M330 190 H470 V280 H330 Z')} {L('M350 210 H450 M350 230 H450 M350 250 H450 M400 190 V280', 'sd-thin')}
        <text className="sd-t" x="400" y="305">BUILDING</text>
      </g>
    </svg>
  );
}
