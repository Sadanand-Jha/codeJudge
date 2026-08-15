export type FeedPostType =
  | "tutorial"
  | "editorial"
  | "experience"
  | "tips"
  | "ai";

export interface FeedPost {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  title: string;
  subtitle: string;
  preview: string;
  tags: string[];
  likes: number;
  comments: number;
  type: FeedPostType;
  readTime: string;
  body: string;
}

export interface ArticleComment {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  replies?: ArticleComment[];
}

export const feedPosts: FeedPost[] = [
  {
    id: 1,
    author: "Sarah Chen",
    handle: "@sarahcodes",
    avatar: "SC",
    time: "2 hours ago",
    title: "Understanding Dijkstra’s Algorithm with Visual Intuition",
    subtitle:
      "Why the greedy choice is always safe, a worked example, a clean C++ implementation, and the one-line intuition that makes it stick.",
    preview:
      "I spent the last week building animated visualizations for shortest path algorithms. Here is what finally made Dijkstra click for me...",
    tags: ["Algorithm", "Tutorial", "Graph"],
    likes: 342,
    comments: 56,
    type: "tutorial",
    readTime: "8 min read",
    body: `Dijkstra's algorithm solves the **single-source shortest path** problem on weighted graphs where every edge weight is **non-negative**. It answers one question: *"What is the cheapest way to travel from a source node to every other node?"*

It powers GPS route planning, network routing protocols (OSPF), and countless competitive programming problems. If you can recognize when a problem is "shortest path with non-negative weights", Dijkstra is your answer.

---

## The Core Idea

Instead of exploring the whole graph at once, Dijkstra rests on a single invariant:

> Among all unvisited nodes, the one with the **smallest tentative distance** can never receive a shorter path later.

Why is that safe? Because every edge weight is non-negative. Any alternative route to that node must first pass through some other unvisited node that is already *farther away* — adding a non-negative edge on top can only make the total distance larger.

**The greedy choice is safe.** That sentence *is* the algorithm.

### A mental model

Imagine pouring water from the source. The wavefront reaches nodes in increasing order of distance. Dijkstra is exactly that wavefront, but computed exactly — with a priority queue instead of guesswork.

---

## Step-by-Step Example

Consider this tiny weighted graph:

| Edge | Weight |
| --- | --- |
| A → B | 4 |
| A → C | 2 |
| C → B | 1 |
| B → D | 5 |
| C → D | 8 |

Start at **A**:

1. Set \`dist[A] = 0\`, push \`(0, A)\`.
2. Pop \`(0, A)\`. Relax A → B (\`dist[B] = 4\`) and A → C (\`dist[C] = 2\`).
3. Pop \`(2, C)\` — the smallest frontier node. Relax C → B → \`dist[B] = 3\` (better than 4!), and C → D → \`dist[D] = 10\`.
4. Pop \`(3, B)\`. Relax B → D → \`dist[D] = 8\` (better than 10).
5. Pop \`(8, D)\`. Nothing left to relax.

Final distances: \`A = 0, C = 2, B = 3, D = 8\`.

Notice that **B was improved twice**. The priority queue handles this naturally — the better value is pushed later, and the stale, larger entry is simply skipped.

---

## Implementation

Here is a clean C++ implementation using \`std::priority_queue\`:

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

using pii = pair<int, int>;

vector<int> dijkstra(int src, const vector<vector<pii>>& g) {
    int n = (int)g.size();
    vector<int> dist(n, INT_MAX);
    priority_queue<pii, vector<pii>, greater<pii>> pq;

    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d != dist[u]) continue; // stale entry — skip it

        for (auto [v, w] : g[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }

    return dist;
}
\`\`\`

### Why \`if (d != dist[u]) continue;\`

A node can be pushed onto the heap multiple times as its distance improves. That guard skips the outdated copies — it is what keeps both the correctness and the tight complexity.

---

## Complexity

- **Time:** \`O((V + E) log V)\` — every edge is relaxed at most once, and each successful relaxation pushes onto the heap.
- **Space:** \`O(V)\` for the distance array plus \`O(V)\` for the heap.

---

## Visual Intuition

Lay the graph out as nodes on a board and watch the algorithm run:

1. The source lights up with distance \`0\`.
2. The closest unvisited node flashes and becomes **settled**.
3. Its neighbors receive **updated distances** (they glow as the frontier).
4. Repeat until every node is settled.

The settled region grows like a blob — exactly like a BFS wave, but warped by edge weights. BFS gives you the same intuition for unweighted graphs; Dijkstra is simply its weighted generalization.

![diagram:dijkstra](#)

---

## Common Mistakes

1. **Using a normal queue instead of a priority queue** — this silently degrades Dijkstra into a flood that can settle nodes too early.
2. **Forgetting the stale-entry skip** — revisiting settled nodes breaks correctness and inflates the running time.
3. **Ignoring the non-negative weight requirement** — with negative edges, use Bellman–Ford or SPFA instead.
4. **Overflow** — initialize \`dist\` with a large sentinel, but be careful that \`dist[u] + w\` does not overflow.
5. **Off-by-one on node IDs** — double-check whether the input is 0-indexed or 1-indexed.

---

## Final Takeaway

Dijkstra is the workhorse of shortest-path problems. Master the greedy invariant (*"the closest unvisited node is final"*), the stale-entry skip, and the complexity argument, and you will start spotting it everywhere — from network routing to "Minimum Cost to Connect Cities" and beyond.`,
  },
  {
    id: 2,
    author: "Arjun Mehta",
    handle: "@arjunmehta",
    avatar: "AM",
    time: "4 hours ago",
    title: "Codeforces Round #945 — Problem D Editorial",
    subtitle:
      "A clean O(n log n) solution using a segment tree with lazy propagation, with a full walkthrough and C++ code.",
    preview:
      "A clean O(n log n) solution using a segment tree with lazy propagation. Full explanation with code...",
    tags: ["Editorial", "Codeforces", "Advanced"],
    likes: 189,
    comments: 23,
    type: "editorial",
    readTime: "6 min read",
    body: `Problem D this round looked intimidating at first glance, but it collapses into a well-known pattern once you restate it. Here is the complete walkthrough.

## Restating the problem

We are asked to answer a set of range queries where every position needs the same aggregate update applied. The naive approach is \`O(n * q)\`, which obviously does not fit.

The key observation is that each query only ever adds to a contiguous segment. That is the textbook signature of a **lazy segment tree**.

## The Core Idea

A segment tree stores an aggregate (here, the sum) for every segment of the array. When a query covers a node's whole segment, we apply the update to the node and *defer* pushing it to its children until they are actually visited.

That deferral is the "lazy propagation" — it is what turns \`O(n)\` updates into \`O(log n)\`.

## Implementation

\`\`\`cpp
struct SegTree {
    int n;
    vector<long long> tree, lazy;

    SegTree(int n) : n(n), tree(4 * n), lazy(4 * n) {}

    void push(int idx, int l, int r) {
        if (lazy[idx] == 0 || l == r) return;
        int mid = (l + r) / 2;
        tree[idx * 2] += lazy[idx] * (mid - l + 1);
        tree[idx * 2 + 1] += lazy[idx] * (r - mid);
        lazy[idx * 2] += lazy[idx];
        lazy[idx * 2 + 1] += lazy[idx];
        lazy[idx] = 0;
    }

    void update(int idx, int l, int r, int ql, int qr, long long val) {
        if (qr < l || r < ql) return;
        if (ql <= l && r <= qr) {
            tree[idx] += val * (r - l + 1);
            lazy[idx] += val;
            return;
        }
        push(idx, l, r);
        int mid = (l + r) / 2;
        update(idx * 2, l, mid, ql, qr, val);
        update(idx * 2 + 1, mid + 1, r, ql, qr, val);
        tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
    }
};
\`\`\`

## Complexity

- **Time:** \`O(n log n)\` — each query touches \`O(log n)\` nodes.
- **Space:** \`O(n)\` for the tree and lazy arrays.

## Final Takeaway

The moment you see "add \`x\` to every position in \`[l, r]\`" — lazy segment tree. Recognizing that signature early is what separates a 30-minute solve from an hour of staring at the screen.`,
  },
  {
    id: 3,
    author: "Priya Nair",
    handle: "@priyanair",
    avatar: "PN",
    time: "6 hours ago",
    title: "How I prepared for Google internships — 6 month roadmap",
    subtitle:
      "From zero DSA knowledge to cracking Google. Exactly what I studied, the problems I solved, and the mistakes I avoided.",
    preview:
      "From zero DSA knowledge to cracking Google. Here is exactly what I studied, which problems I solved, and the mistakes I avoided...",
    tags: ["Interview", "Career", "Google"],
    likes: 892,
    comments: 124,
    type: "experience",
    readTime: "9 min read",
    body: `When I started, I could not solve a two-pointer problem without peeking at the editorial. Six months later I accepted a Google internship offer. This is the roadmap that got me there.

## Month 1–2: Foundations, the boring way

I forced myself to do every problem with a **pen and paper first**. Writing the brute force before the optimized solution trains the exact muscle interviews test.

Topics in order: arrays, hashing, two pointers, binary search, then stacks and queues.

## Month 3–4: The heavy hitters

This is where most people quit. I split the time into:

1. **Graphs** — BFS, DFS, Dijkstra, topological sort.
2. **Trees** — traversal, LCA, diameter, recursion patterns.
3. **Dynamic programming** — 1D first, then 2D, then bitmask.

I tracked my solved problems in a spreadsheet with a column for the *pattern*, not the problem name.

## Month 5: Mock interviews every week

Booking real mocks is non-negotiable. Talking through a problem out loud is a completely different skill from solving it silently.

## Mistakes I avoided

1. **Hopping topics too fast** — mastery needs spaced repetition, not breadth.
2. **Ignoring the explanation** — if you cannot explain *why* the solution works, redo it.
3. **Skipping easy problems** — fast, clean solves on easy problems build the speed you need in a real interview.

## Final Takeaway

Consistency beats intensity. Two focused hours daily for six months is enough — but only if you spend them on *understanding*, not on collecting submissions.`,
  },
  {
    id: 4,
    author: "Rahul Verma",
    handle: "@rahulverma",
    avatar: "RV",
    time: "8 hours ago",
    title: "Top 10 Trie patterns you must know",
    subtitle:
      "Tries appear in many unexpected places. These patterns cover 80% of all Trie problems on competitive programming platforms.",
    preview:
      "Tries appear in many unexpected places. These patterns cover 80% of all Trie problems on competitive programming platforms...",
    tags: ["Data Structure", "Trie", "Patterns"],
    likes: 256,
    comments: 41,
    type: "tips",
    readTime: "5 min read",
    body: `A Trie (prefix tree) is one of those structures that feels niche — until you realize how many problems secretly ask for it.

## What a Trie is

Each node stores one character of a word. Words that share a prefix share the same path. Lookup becomes \`O(L)\` where \`L\` is the word length, independent of how many words are stored.

\`\`\`cpp
struct TrieNode {
    TrieNode* children[26] = {};
    bool terminal = false;
    int words = 0; // words passing through this node
};
\`\`\`

## The 10 patterns

1. **Insert / search** — the baseline every problem builds on.
2. **Prefix search** — check if any stored word starts with a prefix.
3. **Word count** — maintain a count per node for "how many words have this prefix".
4. **Lexicographic order** — DFS in alphabetical order yields sorted words.
5. **Maximum XOR pair** — traverse the trie bit-by-bit, greedily taking the opposite bit.
6. **Auto-complete** — DFS from a prefix to collect suggestions.
7. **Wildcard matching** — recursive search that treats \`.\` as any child.
8. **Delete with cleanup** — remove nodes only when their subtree is empty.
9. **Suffix / reversed trie** — store words reversed to handle suffix queries.
10. **Rolling prefix sums** — store counts and aggregate values along the path.

## Complexity

- **Build:** \`O(N * L)\`
- **Each lookup:** \`O(L)\`
- **Space:** \`O(N * L)\`

## Final Takeaway

If a problem talks about *prefixes*, *words*, or *maximum XOR*, reach for a Trie before overthinking. It is almost always the intended structure.`,
  },
  {
    id: 5,
    author: "Emily Zhang",
    handle: "@emilyzhang",
    avatar: "EZ",
    time: "12 hours ago",
    title: "AI-generated insights: detecting DP patterns automatically",
    subtitle:
      "Using transformer models to recognize when a problem is secretly a DP problem in disguise. Cool results...",
    preview:
      "Using transformer models to recognize when a problem is secretly a DP problem in disguise. Cool results...",
    tags: ["AI", "Research", "DP"],
    likes: 567,
    comments: 89,
    type: "ai",
    readTime: "7 min read",
    body: `What if a model could read a problem statement and tell you *which algorithmic pattern applies* — before you write a single line?

## The idea

Competitive programming problems are usually written to hide the pattern. A "DP problem in disguise" is a DP problem whose statement talks about counting paths, maximizing profit, or choosing subsets — without ever saying "dynamic programming".

We trained a transformer to classify problems into a fixed set of patterns: DP, graph, greedy, binary search, math, and more.

## What worked

1. **Tokenizing the statement** with the standard CP tokenizer (variable names and constraints matter a lot).
2. **Constraint-feature injection** — feeding \`n <= 10^5\` explicitly is a huge signal for complexity.
3. **Balanced training data** across the pattern classes.

## Sample insight

> If the problem says "count the number of ways" and \`n <= 10^5\`, it is almost always DP. If it says "minimum number of operations", think greedy or DP — check for overlapping subproblems.

## Limitations

The model is a *hint engine*, not an oracle. It confidently misclassifies adversarial problems, and it cannot reason — it only recalls distributional associations.

## Final Takeaway

Pattern detection is the first step toward *reasoning* assistants for CP. For now, treat it as a second pair of eyes — faster than reading all ten editorials, but not a replacement for understanding.`,
  },
];

export const getFeedPostById = (id: string | number): FeedPost | undefined =>
  feedPosts.find((p) => String(p.id) === String(id));

export const getRelatedPosts = (post: FeedPost, count = 3): FeedPost[] =>
  feedPosts
    .filter((p) => p.id !== post.id)
    .sort(
      (a, b) =>
        Math.abs(a.tags.length - post.tags.length) -
        Math.abs(b.tags.length - post.tags.length)
    )
    .slice(0, count);

export const defaultComments: ArticleComment[] = [
  {
    id: "c1",
    author: "David Kim",
    handle: "@dkim",
    avatar: "DK",
    time: "1 hour ago",
    text: "The 'greedy choice is safe' framing is exactly what I needed. It finally clicked after reading this.",
    likes: 24,
    replies: [
      {
        id: "c1r1",
        author: "Sarah Chen",
        handle: "@sarahcodes",
        avatar: "SC",
        time: "50 minutes ago",
        text: "Happy it helped! The wavefront mental model is what I reach for in every contest now.",
        likes: 9,
      },
    ],
  },
  {
    id: "c2",
    author: "Aisha Khan",
    handle: "@aishakhan",
    avatar: "AK",
    time: "2 hours ago",
    text: "Great explanation. One suggestion: mention that the heap can hold up to E entries, which is why the space is O(V + E) in the worst case.",
    likes: 18,
  },
  {
    id: "c3",
    author: "Leo Martins",
    handle: "@leomartins",
    avatar: "LM",
    time: "3 hours ago",
    text: "The stale-entry continue guard tripped me up for years. Thank you for calling it out explicitly.",
    likes: 31,
  },
];
