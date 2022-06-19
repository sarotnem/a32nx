const DeparturePagination = Object.freeze(
    {
        DEPT_PAGE: 4,
    }
);

class CDUAvailableDeparturesPage {
    static ShowPage(mcdu, airport, pageCurrent = 0, sidSelection = false) {
        // TODO SEC F-PLN
        const targetPlan = mcdu.flightPlanService.activeOrTemporary;
        const planColor = mcdu.flightPlanService.hasTemporary ? "yellow" : "green";

        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.AvailableDeparturesPage;
        let selectedRunwayCell = "---";
        let selectedRunwayCellColor = "white";

        const selectedRunway = targetPlan.originRunway;
        const selectedDeparture = targetPlan.originDeparture;
        const selectedEnRouteTransition = targetPlan.departureEnrouteTransition;

        if (selectedRunway) {
            selectedRunwayCell = selectedRunway.ident.substring(2);
            selectedRunwayCellColor = planColor;
        }
        let selectedSidCell = "------";
        let selectedSidCellColor = "white";
        let selectedTransCell = "------";
        let selectedTransCellColor = "white";

        if (selectedDeparture) {
            selectedSidCell = selectedDeparture.ident;
            selectedSidCellColor = planColor;

            if (selectedEnRouteTransition) {
                selectedTransCell = selectedEnRouteTransition.ident;
                selectedTransCellColor = planColor;
            } else {
                selectedTransCell = "NONE";
            }
        }

        let insertRow = ["<RETURN"];

        mcdu.onLeftInput[5] = () => {
            CDUFlightPlanPage.ShowPage(mcdu);
        };

        const rows = [[""], [""], [""], [""], [""], [""], [""], [""]];

        if (!sidSelection) {
            const availableRunways = targetPlan.availableOriginRunways;

            for (let i = 0; i < DeparturePagination.DEPT_PAGE; i++) {
                const index = i + pageCurrent * DeparturePagination.DEPT_PAGE;
                const runway = availableRunways[index];

                if (runway) {
                    rows[2 * i] = [
                        "{" + runway.ident.substring(2).padEnd(8) + NXUnits.mToUser(runway.length).toFixed(0).padStart(5) + "{small}" + NXUnits.userDistanceUnit().padEnd(2) + "{end}" + "".padEnd(11) + "[color]cyan"
                    ];
                    rows[2 * i + 1] = ["{sp}{sp}{sp}" + Math.round(runway.bearing).toFixed(0).padStart(3, '0') + "[color]cyan",];

                    mcdu.onLeftInput[i + 1] = async () => {
                        try {
                            await mcdu.flightPlanService.setOriginRunway(runway.ident);

                            CDUAvailableDeparturesPage.ShowPage(mcdu, airport, 0, true);
                        } catch (e) {
                            console.error(e);
                            mcdu.setScratchpadMessage(NXFictionalMessages.internalError);
                        }
                    };
                }
            }
        } else {

            insertRow = ["{ERASE[color]amber", "INSERT*[color]amber"];
            mcdu.onRightInput[5] = () => {
                mcdu.insertTemporaryFlightPlan(() => {
                    mcdu.updateConstraints();
                    mcdu.onToRwyChanged();
                    CDUPerformancePage.UpdateThrRedAccFromOrigin(mcdu, true, true);
                    CDUPerformancePage.UpdateEngOutAccFromOrigin(mcdu);
                    CDUFlightPlanPage.ShowPage(mcdu, 0);
                });
            };

            const lower = pageCurrent * DeparturePagination.DEPT_PAGE;
            const upper = (pageCurrent + 1) * DeparturePagination.DEPT_PAGE;

            const availableDepartures = targetPlan.availableDepartures;

            let nextDep = 0;
            for (let depI = 0; nextDep < upper && depI < availableDepartures.length; depI++) {
                const sid = availableDepartures[depI];

                let transitionIndex = 0;
                let runwayTransitionIdent = '';
                if (sid) {
                    let sidMatchesSelectedRunway = false;

                    if (selectedRunway) {
                        for (let j = 0; j < sid.runwayTransitions.length; j++) {
                            if (sid.runwayTransitions[j].ident === selectedRunway.ident) {
                                sidMatchesSelectedRunway = true;
                                transitionIndex = j;
                                runwayTransitionIdent = sid.runwayTransitions[j].ident;
                                break;
                            }
                        }
                    }

                    const transitionRunway = targetPlan.availableOriginRunways.find((it) => it.ident === runwayTransitionIdent);

                    if (!selectedRunway || sidMatchesSelectedRunway) {
                        if (nextDep >= lower) {
                            rows[2 * (nextDep - lower)] = [`${(selectedDeparture ? selectedDeparture.ident : undefined) === sid.ident ? " " : "{"}${sid.ident}[color]cyan`];

                            mcdu.onLeftInput[(nextDep - lower) + 1] = async () => {
                                try {
                                    await mcdu.flightPlanService.setOriginRunway(transitionRunway.ident);
                                    await mcdu.flightPlanService.setDepartureProcedure(sid.ident);

                                    CDUAvailableDeparturesPage.ShowPage(mcdu, airport, pageCurrent, true);
                                } catch (e) {
                                    console.error(e);
                                    mcdu.setScratchpadMessage(NXFictionalMessages.internalError);
                                }
                            };
                        }
                        ++nextDep;
                    }
                }
            }
            if (nextDep < upper) {
                rows[2 * (nextDep - lower)] = ["{NO SID[color]cyan"];

                mcdu.onLeftInput[(nextDep - lower) + 1] = async () => {
                    try {
                        await mcdu.flightPlanService.setDepartureProcedure(undefined);

                        CDUAvailableDeparturesPage.ShowPage(mcdu, airport, pageCurrent, true);
                    } catch (_) {
                        mcdu.setScratchpadMessage(NXFictionalMessages.internalError);
                    }
                };
            }
            if (selectedDeparture) {
                for (let i = 0; i < DeparturePagination.DEPT_PAGE; i++) {
                    const enRouteTransitionIndex = i + pageCurrent * DeparturePagination.DEPT_PAGE;
                    const enRouteTransition = selectedDeparture.enrouteTransitions[enRouteTransitionIndex];

                    if (enRouteTransition) {
                        rows[2 * i][1] = `${enRouteTransition.ident}${selectedEnRouteTransition.ident === enRouteTransition.ident ? " " : "}"}[color]cyan`;

                        mcdu.onRightInput[i + 1] = async () => {
                            try {
                                await mcdu.flightPlanService.setDepartureEnrouteTransition(enRouteTransition.ident);

                                CDUAvailableDeparturesPage.ShowPage(mcdu, airport, pageCurrent, true);
                            } catch (e) {
                                console.error(e);
                                mcdu.setScratchpadMessage(NXFictionalMessages.internalError);
                            }
                        };
                    }
                }
            }
        }

        let up = false;
        let down = false;
        let maxPage = 0;

        const availableRunways = targetPlan.availableOriginRunways;

        if (sidSelection) {
            const availableDepartures = targetPlan.availableDepartures;

            if (selectedRunway) {
                for (const departure of availableDepartures) {
                    for (const transition of departure.runwayTransitions) {
                        if (transition.ident === selectedRunway.ident) {
                            maxPage++;
                            break;
                        }
                    }
                }
                maxPage = Math.ceil(maxPage / DeparturePagination.DEPT_PAGE) - ((maxPage % DeparturePagination.DEPT_PAGE === 0) ? 0 : 1);
            } else {
                maxPage = Math.ceil(availableDepartures.length / DeparturePagination.DEPT_PAGE) - ((availableDepartures.length % DeparturePagination.DEPT_PAGE === 0) ? 0 : 1);
            }

            if (selectedDeparture) {
                maxPage = Math.max(maxPage, Math.ceil(selectedDeparture.enrouteTransitions.length / DeparturePagination.DEPT_PAGE) - ((selectedDeparture.enrouteTransitions.length % DeparturePagination.DEPT_PAGE === 0) ? 0 : 1));
            }
        } else {
            maxPage = Math.ceil(availableRunways.length / DeparturePagination.DEPT_PAGE) - 1;
        }
        if (pageCurrent < maxPage) {
            mcdu.onUp = () => {
                pageCurrent++;
                if (pageCurrent < 0) {
                    pageCurrent = 0;
                }
                CDUAvailableDeparturesPage.ShowPage(mcdu, airport, pageCurrent, sidSelection);
            };
            up = true;
        }
        if (pageCurrent > 0) {
            mcdu.onDown = () => {
                pageCurrent--;
                if (pageCurrent < 0) {
                    pageCurrent = 0;
                }
                CDUAvailableDeparturesPage.ShowPage(mcdu, airport, pageCurrent, sidSelection);
            };
            down = true;
        }
        mcdu.setArrows(up, down, true, true);
        mcdu.setTemplate([
            ["{sp}DEPARTURES {small}FROM{end} {green}" + targetPlan.originAirport.ident + "{sp}{sp}{sp}"],
            ["{sp}RWY", "TRANS{sp}", "{sp}SID"],
            [selectedRunwayCell + "[color]" + selectedRunwayCellColor, selectedTransCell + "[color]" + selectedTransCellColor, selectedSidCell + "[color]" + selectedSidCellColor],
            sidSelection ? ["SIDS", "TRANS", "AVAILABLE"] : ["", "", "AVAILABLE RUNWAYS{sp}"],
            rows[0],
            rows[1],
            rows[2],
            rows[3],
            rows[4],
            rows[5],
            rows[6],
            rows[7],
            insertRow
        ]);
        mcdu.onPrevPage = () => {
            CDUAvailableDeparturesPage.ShowPage(mcdu, airport, 0, !sidSelection);
        };
        mcdu.onNextPage = mcdu.onPrevPage;

    }
}
