# Blackout USA
This is a prototype digital experience that allows students and others to learn about power system operations by interactively being introduced to various aspects of power system operations. The main learning objectives are:
* Learn about the types of electric generators (wind, solar, nuclear, gas, coal) and their differences.
* Learn about electric demand or “load” and balancing generation to load at all times.
* Learn about “reserves” and how to keep enough generating units running to prepare for future events.
* Learn about grid frequency, how it is controlled by the load-generation balance, and how loss of frequency control can lead to a blackout.
* Learn about transmission lines and how to control their loading levels to avoid cascading blackouts.
* Learn about cost considerations in operating a power grid.

For more information, see [https://birchfield.engr.tamu.edu/blackout-usa/](https://birchfield.engr.tamu.edu/blackout-usa/)

This material is based upon work supported in part by the National Science Foundation under Award No. 2442131. Any opinions, findings and conclusions or recommendations expressed in this material
are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.

# TODO (React Transition)

## Crucial TODO
- Update images in the How-To modal
- The scenario/day transition works, but the briefing for the wrong day is displayed at the start of the day. For example, when the user finishes `Day 1` and chooses to move to `Day 2`, the briefing for `Day 1` appears instead of `Day 2`. However, if they dismiss the briefing, then click on the briefing button again, `Day 2` briefing is displayed. Small bug should be easy to fix.
- Need to display the start-up time for the generation substations.
- In the `energy` tab, display the MW values for the four energy categories for readability.
- Find a way to shrink the pause/play controls so we can display the frequency (one of the more important values to know) always. Right now, it is only in the energy tab.
- In the line modal, use the same formatting as the generation modal to be consistent.
- Add legend for indicator circles in the `lines` and `substations` tabs
- Small inconsistancy with how pause/play/FF works

## Less Crucial TODO
- Make an option to have the alerts be a static view on the page, or find a nicer way to have them pop up on screen that is not super distracting.
- Key-Bindings (e.g., `Ctrl+O` could open the largest load)
- In the load modal, make the `IN-SERVICE` tag green
- Find an abbreviated term for `OUT-OF-SERVICE` that sometimes causes text wrapping.
- Generally improve the `finance` tab, which is basically useless at the moment.
- In the generation substation modal, display the generation type icon.
