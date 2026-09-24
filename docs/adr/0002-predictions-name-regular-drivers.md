# Predictions name Regular Drivers; substitutes inherit their Picks

A Pick always names a Regular Driver, meaning a race seat on the Season list, never a stand-in. When
someone else races in that seat for a Round, the App Admin records a Substitution and the substitute's
result counts for the Regular Driver. We chose manual Substitutions over detecting them from results
data: they happen once or twice a Season, and detection has awkward edge cases like reserve drivers in
practice or permanent seat swaps. Substitutes never appear in the driver list, so a Prediction cannot
contain both a driver and their stand-in.
