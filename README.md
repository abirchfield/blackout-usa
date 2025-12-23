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
- Update a few images in the How-To modal
- Need to display the start-up time for the generation substations.
- Display the MW values for the four energy categories for readability.
- Small inconsistancy with how pause/play/FF works

## Less Crucial TODO
- After the last day, it goes back to day 1.
- Key-Bindings (e.g., `Ctrl+O` could open the largest load)
- In the load modal, make the `IN-SERVICE` tag green
- Find an abbreviated term for `OUT-OF-SERVICE` that sometimes causes text wrapping.
- In the generation substation modal, display the generation type icon.
- In the line modal, use the same formatting as the generation modal to be consistent.
- Use squares instead of circles for the load indicators in the substation tab.
