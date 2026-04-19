-- Rename neighborhoods table to places
ALTER TABLE "neighborhoods" RENAME TO "places";

-- Rename neighborhoodId columns to placeId
ALTER TABLE "heat_measurements" RENAME COLUMN "neighborhoodId" TO "placeId";
ALTER TABLE "interventions" RENAME COLUMN "neighborhoodId" TO "placeId";
ALTER TABLE "ngo_surveys" RENAME COLUMN "neighborhoodId" TO "placeId";

-- Rename neighborhoodResults column in simulation_results
ALTER TABLE "simulation_results" RENAME COLUMN "neighborhoodResults" TO "placeResults";

-- Rename indexes and constraints
ALTER INDEX "neighborhoods_cityId_name_key" RENAME TO "places_cityId_name_key";
