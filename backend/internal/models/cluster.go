package models

import "encoding/json"

type ClusterMember struct {
	Lang     string `json:"lang"`
	Word     string `json:"word"`
	Ipa      string `json:"ipa"`
	Pos      string `json:"pos"`
	Gloss    string `json:"gloss"`
	EtymText string `json:"etym_text,omitempty"`
}

type CognateCluster struct {
	ID            int64           `json:"id"`
	Root          string          `json:"root"`
	ProtoLanguage string          `json:"proto_language"`
	LanguageCount int             `json:"language_count"`
	Languages     []string        `json:"languages"`
	Members       json.RawMessage `json:"members"`
	SampleGloss   *string         `json:"sample_gloss,omitempty"`
}

type ClustersQueryParams struct {
	MinLanguages  int
	ProtoLanguage string
	Language      string
	Search        string
	Limit         int
	Offset        int
}

type ClustersResult struct {
	Items  []CognateCluster `json:"items"`
	Total  int              `json:"total"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}
