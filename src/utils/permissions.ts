import { config } from "../config";
import { db } from "../databases/databases";
import { Category } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { oneOf } from "./promise";
import { getReputation } from "./reputation";

interface CanSubmitResult {
    canSubmit: boolean;
    reason?: string;
}

export async function canSubmit(userID: HashedUserID, category: Category): Promise<CanSubmitResult> {
    switch (category) {
        case "chapter":
            return {
                canSubmit: await oneOf([isUserVIP(userID),
                    (async () => (await getReputation(userID)) > config.minReputationToSubmitChapter)(),
                    hasFeature(userID, Feature.ChapterSubmitter)
                ])
            };
        default:
            return {
                canSubmit: await oneOf([isUserVIP(userID),
                    (async () => (await getReputation(userID)) > config.minReputationToSubmitFiller)(),
                    hasFeature(userID, Feature.FillerSubmitter),
                    (async () => (await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ? AND category != 'filler' AND "timeSubmitted" < 1660096797000 LIMIT 4`, [userID], { useReplica: true }))?.submissionCount > 3)()
                ]),
                reason: "Unfortunately, someone is doing a targeted attack and as a temporary emergency measure, segment submission for new users is disabled. You can request submission access on chat.sponsor.ajay.app/#filler, discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app"
            };
    }

    return {
        canSubmit: true
    };
}