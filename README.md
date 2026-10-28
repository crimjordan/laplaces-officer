# Laplace's Officer

An interactive predictive-policing thought experiment and automatically updated public-data observatory.

## Publish
Open **Settings → Pages** in this repository. Under **Build and deployment**, select **Deploy from a branch**, choose **main** and **/(root)**, and save. The intended address is https://crimjordan.github.io/laplaces-officer/.

## Automated updates
The GitHub Actions workflow **Update research data** runs daily at 09:17 UTC and supports manual runs under **Actions**. It fetches scholarly metadata from OpenAlex and Crossref and approximate counts of OpenStreetMap surveillance features through Overpass. Workflow permissions must allow **Read and write permissions** for repository contents.

## Interpretation
The simulator uses hypothetical classifier assumptions, not validated crime prediction. OpenStreetMap features are incomplete and subject to contributor bias. Research records are discovery metadata, not a systematic review. Do not use this project for individual risk assessment or enforcement.

## Local use
Serve the root directory as static files. Run `python scripts/update.py` and `python scripts/update_osm.py` to populate data snapshots.
