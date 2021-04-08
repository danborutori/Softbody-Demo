namespace hahaApp {
    const btV = new Ammo.btVector3

    export function btConvexHullShapeFromGeometry( geometry: THREE.BufferGeometry ){
        const convexHull = new (THREE as any).ConvexHull()
        convexHull.setFromObject( new THREE.Mesh(geometry))

        const coneColShape = new Ammo.btConvexHullShape()
        const faces = convexHull.faces
        for ( let i = 0; i < faces.length; i ++ ) {

            const face = faces[ i ]
            let edge = face.edge

            // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

            do {

                const point = edge.head().point


                btV.setValue( point.x, point.y, point.z )
                coneColShape.addPoint(btV)

                edge = edge.next

            } while ( edge !== face.edge )

        }
        coneColShape.setMargin(0.005)

        return coneColShape
    }

}