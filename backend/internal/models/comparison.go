package models

import "encoding/json"

type WordComparison struct {
	ID              int64           `json:"id"`
	LangA           string          `json:"lang_a"`
	WordA           string          `json:"word_a"`
	IpaA            *string         `json:"ipa_a,omitempty"`
	DefA            string          `json:"def_a"`
	PosA            *string         `json:"pos_a,omitempty"`
	LangB           string          `json:"lang_b"`
	WordB           string          `json:"word_b"`
	IpaB            *string         `json:"ipa_b,omitempty"`
	DefB            string          `json:"def_b"`
	PosB            *string         `json:"pos_b,omitempty"`
	OrthographicSim float32         `json:"orthographic_sim"`
	PhoneticSim     float32         `json:"phonetic_sim"`
	SemanticSim     float32         `json:"semantic_sim"`
	Category        string          `json:"category"`
	FalseFriendType *string         `json:"false_friend_type,omitempty"`
	SensesA         json.RawMessage `json:"senses_a,omitempty"`
	SensesB         json.RawMessage `json:"senses_b,omitempty"`
	EtymRoot        *string         `json:"etym_root,omitempty"`
	EtymTextA       *string         `json:"etym_text_a,omitempty"`
	EtymTextB       *string         `json:"etym_text_b,omitempty"`
}

type PairsQueryParams struct {
	SourceLang      string
	TargetLang      string
	MinPhon         float32
	MaxPhon         float32
	MinSem          float32
	MaxSem          float32
	Category        string
	FalseFriendType string
	Limit           int
	Offset          int
}

type PairsResult struct {
	Items  []WordComparison `json:"items"`
	Total  int              `json:"total"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}
