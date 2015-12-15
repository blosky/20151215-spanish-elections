#!/bin/bash
CWD=`pwd`
ROOTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"/../..
FLAGS='-p iso3=ADM0_A3 -p admin=ADMIN -p id=SU_A3 -p name=NAME_LONG -p continent=CONTINENT -p subregion=SUBREGION'

cd $ROOTDIR
topojson -o $ROOTDIR/client/json/world-simple.topojson -s 0.000015 -q 1e6 $FLAGS $ROOTDIR/tmp/map_subunits/ne_10m_admin_0_map_subunits.shp
topojson -o $ROOTDIR/client/json/world.topojson -s 0.000000005 -q 1e6 $FLAGS $ROOTDIR/tmp/map_subunits/ne_10m_admin_0_map_subunits.shp
topojson -o client/json/roads.topojson -s 0.000000005 -q 1e6 -p type tmp/roads2/ne_10m_roads.shp
