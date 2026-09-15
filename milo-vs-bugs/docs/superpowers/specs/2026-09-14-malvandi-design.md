# Malvandi vs. Bugs

Approved scenario: a single-screen 2D arcade game. Move with WASD/arrows,
hold Space to shoot patches toward the nearest bug, survive 60 seconds with
three hearts. Coffee boosts movement and firing for five seconds. Deployment
waves arrive every 15 seconds, with programmer jokes. Start and retry overlays,
score, remaining time, local best score, pause, and touch controls.

Use dependency-free HTML, CSS, and Canvas JavaScript. Separate simulation from
rendering for deterministic Node tests. Pause when the tab loses visibility.
No external assets or network services required. Local storage failure must
not prevent play. Victory at 60 seconds; defeat at zero hearts.

Visual tokens: desktop #b6cef2, arena #182b46, ink #172a46, paper #f4f7ff,
bugs #ff776e, coffee #ffd166. System rounded sans for headings, monospace for
terminal jokes. Centered game window, large canvas, compact HUD and controls.
The memorable element is Malvandi and the cartoon bugs, not decorative UI.

Verification: Node simulation tests for movement, damage immunity, shooting,
coffee, wave timing and terminal states; browser smoke test and local HTTP check.
