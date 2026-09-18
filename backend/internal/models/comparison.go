package models

type WordComparison struct {
	ID              int64   `json:"id"`
	LangA           string  `json:"lang_a"`
	WordA           string  `json:"word_a"`
	IpaA            *string `json:"ipa_a,omitempty"`
	DefA            string  `json:"def_a"`
	PosA            *string `json:"pos_a,omitempty"`
	LangB           string  `json:"lang_b"`
	WordB           string  `json:"word_b"`
	IpaB            *string `json:"ipa_b,omitempty"`
	DefB            string  `json:"def_b"`
	PosB            *string `json:"pos_b,omitempty"`
	OrthographicSim float32 `json:"orthographic_sim"`
	PhoneticSim     float32 `json:"phonetic_sim"`
	SemanticSim     float32 `json:"semantic_sim"`
	Category        string  `json:"category"`
}

type PairsQueryParams struct {
	SourceLang string
	TargetLang string
	MinPhon    float32
	MaxPhon    float32
	MinSem     float32
	MaxSem     float32
	Category   string
	Limit      int
	Offset     int
}

type PairsResult struct {
	Items  []WordComparison `json:"items"`
	Total  int              `json:"total"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}
