package models

type LanguagePairStats struct {
	Source            string  `json:"source"`
	Target            string  `json:"target"`
	PairCount         int     `json:"pair_count"`
	AvgOrthographic   float32 `json:"avg_orthographic"`
	AvgPhonetic       float32 `json:"avg_phonetic"`
	AvgSemantic       float32 `json:"avg_semantic"`
	TrueCognatesRatio     float32 `json:"true_cognates_ratio"`
	PartialCognatesRatio  float32 `json:"partial_cognates_ratio"`
	FalseFriendsRatio     float32 `json:"false_friends_ratio"`
	TranslationPairsRatio float32 `json:"translation_pairs_ratio"`
	OtherRatio            float32 `json:"other_ratio"`
}

type LanguagesResponse struct {
	Languages []string            `json:"languages"`
	Pairs     []LanguagePairStats `json:"pairs"`
}
