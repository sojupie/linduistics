package models

type LanguagePairStats struct {
	Source            string  `json:"source"`
	Target            string  `json:"target"`
	PairCount         int     `json:"pair_count"`
	AvgOrthographic   float32 `json:"avg_orthographic"`
	AvgPhonetic       float32 `json:"avg_phonetic"`
	AvgSemantic       float32 `json:"avg_semantic"`
	IdenticalRatio    float32 `json:"identical_ratio"`
	ShiftedRatio      float32 `json:"shifted_ratio"`
	FalseFriendsRatio float32 `json:"false_friends_ratio"`
	DivergentRatio    float32 `json:"divergent_ratio"`
}

type LanguagesResponse struct {
	Languages []string            `json:"languages"`
	Pairs     []LanguagePairStats `json:"pairs"`
}
