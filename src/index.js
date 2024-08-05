/**
 * Example showcasing the partial data invalidation feature of Surface Grid Series
 */

const lcjs = require('@lightningchart/lcjs')
const {
    lightningChart,
    LUT,
    ColorRGBA,
    PalettedFill,
    emptyLine,
    ColorShadingStyles,
    LegendBoxBuilders,
    AxisScrollStrategies,
    PointStyle3D,
    regularColorSteps,
    Themes,
} = lcjs

const COLUMNS = 200
const ROWS = 200

const chart3D = lightningChart({
    warnings: false,
}).Chart3D({
    //  theme: Themes.darkGold
})

chart3D.getDefaultAxisY().setScrollStrategy(AxisScrollStrategies.expansion).setInterval({ start: 0, end: 100, stopAxisAfter: false })

chart3D.setTitle(`3D Surface Grid ${COLUMNS}x${ROWS} | partial invalidation`)

// Define value -> color lookup table.
const theme = chart3D.getTheme()
const lut = new LUT({
    interpolate: true,
    steps: regularColorSteps(0, 50, theme.examples.intensityColorPalette),
    // steps: [
    //     { value: 0, color: ColorRGBA(255, 215, 0) },
    //     { value: 50, color: ColorRGBA(255, 0, 0) },
    //     { value: 100, color: ColorRGBA(0, 0, 255) },
    // ],
})

const heightData = new Array(COLUMNS).fill(0).map((_) => new Array(ROWS).fill(0))

const surfaceSeries3D = chart3D
    .addSurfaceGridSeries({
        columns: COLUMNS,
        rows: ROWS,
    })
    .setFillStyle(new PalettedFill({ lut, lookUpProperty: 'y' }))
    .setWireframeStyle(emptyLine)
    .invalidateHeightMap(heightData)
    .setColorShadingStyle(new ColorShadingStyles.Phong())

// Add legend with color look up table to chart.
const legend = chart3D.addLegendBox(LegendBoxBuilders.HorizontalLegendBox).add(chart3D)

// Animate surface invalidation over a moving "update location". The goal here is to showcase the partial data update feature of LC JS heatmaps and surfaces.
const tStart = window.performance.now()
const updateMaskRadius = 5
const updateMask = []
for (let column = -updateMaskRadius; column <= updateMaskRadius; column += 1) {
    for (let row = -updateMaskRadius; row <= updateMaskRadius; row += 1) {
        const d = Math.sqrt(column ** 2 + row ** 2)
        if (d <= updateMaskRadius) {
            updateMask.push({ column, row })
        }
    }
}
const random = (() => {
    const len = 123512
    const pattern = new Array(len).fill(0).map((_) => Math.random())
    let i = 0
    return () => {
        const next = pattern[i]
        i = (i + 1) % len
        return next
    }
})()
const points = chart3D.addPointSeries().setColorShadingStyle(new ColorShadingStyles.Simple()).setAutoScrollingEnabled(false)
points.setPointStyle(
    new PointStyle3D.Triangulated({
        fillStyle: points.getPointStyle().getFillStyle(),
        shape: 'sphere',
        size: { x: updateMaskRadius * 2, y: 0.1, z: updateMaskRadius * 2 },
    }),
)

const updateMaskValues = new Array(updateMaskRadius * 2 + 1).fill(0).map((_) => new Array(updateMaskRadius * 2 + 1).fill(0))

const updateAnimation = () => {
    const t = window.performance.now() - tStart
    const updateLoc_angle = t * 0.0005
    const updateLoc_radius = 40 + 30 * Math.sin(t * 0.0003) + 10 * Math.cos(t * 0.001)
    const updateLoc = {
        x: Math.round(COLUMNS / 2 + Math.cos(updateLoc_angle) * updateLoc_radius),
        z: Math.round(ROWS / 2 + Math.sin(updateLoc_angle) * updateLoc_radius),
        y: 0,
    }
    for (let iMask = 0; iMask < updateMask.length; iMask += 1) {
        const mask = updateMask[iMask]
        const column = updateLoc.x + mask.column
        const row = updateLoc.z + mask.row
        if (column < heightData.length && column >= 0 && row < heightData[0].length && row >= 0) {
            heightData[column][row] += random()
        }
    }
    for (let col = 0; col < updateMaskRadius * 2 + 1; col += 1) {
        for (let row = 0; row < updateMaskRadius * 2 + 1; row += 1) {
            const colData = updateLoc.x + col - updateMaskRadius
            const rowData = updateLoc.z + row - updateMaskRadius
            if (colData < heightData.length && colData >= 0 && rowData < heightData[0].length && rowData >= 0) {
                updateMaskValues[col][row] = heightData[colData][rowData]
            }
        }
    }
    surfaceSeries3D.invalidateHeightMap({
        iColumn: Math.round(updateLoc.x - updateMaskRadius),
        iRow: Math.round(updateLoc.z - updateMaskRadius),
        values: updateMaskValues,
    })

    points.clear().add(updateLoc)

    requestAnimationFrame(updateAnimation)
}
updateAnimation()
