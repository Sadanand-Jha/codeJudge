export interface MockSolution {
  id: string;
  author: string;
  rating: number;
  likes: number;
  runtimeMs: number;
  memoryMB: number;
  language: string;
  code: string;
}

export const mockSolutions: MockSolution[] = [
  {
    id: "sol_001",
    author: "tourist",
    rating: 3850,
    likes: 1247,
    runtimeMs: 15,
    memoryMB: 3.2,
    language: "C++",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    int n;
    cin >> n;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    
    long long best = a[0], cur = a[0];
    for (int i = 1; i < n; i++) {
        cur = max(a[i], cur + a[i]);
        best = max(best, cur);
    }
    cout << best << "\\n";
    return 0;
}`,
  },
  {
    id: "sol_002",
    author: "benq",
    rating: 3700,
    likes: 892,
    runtimeMs: 22,
    memoryMB: 2.8,
    language: "Java",
    code: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextLong();
        
        long best = a[0], cur = a[0];
        for (int i = 1; i < n; i++) {
            cur = Math.max(a[i], cur + a[i]);
            best = Math.max(best, cur);
        }
        System.out.println(best);
    }
}`,
  },
  {
    id: "sol_003",
    author: "petr",
    rating: 3600,
    likes: 654,
    runtimeMs: 45,
    memoryMB: 4.1,
    language: "Python",
    code: `n = int(input())
a = list(map(int, input().split()))

best = cur = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)

print(best)`,
  },
  {
    id: "sol_004",
    author: "ecnerwala",
    rating: 3500,
    likes: 543,
    runtimeMs: 28,
    memoryMB: 3.5,
    language: "JavaScript",
    code: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
    const n = parseInt(line);
    const a = [];
    rl.on('line', (line2) => {
        a.push(...line2.split(' ').map(Number));
        
        let best = a[0], cur = a[0];
        for (let i = 1; i < n; i++) {
            cur = Math.max(a[i], cur + a[i]);
            best = Math.max(best, cur);
        }
        console.log(best);
        rl.close();
    });
});`,
  },
  {
    id: "sol_005",
    author: "ksun48",
    rating: 3400,
    likes: 421,
    runtimeMs: 18,
    memoryMB: 2.9,
    language: "Rust",
    code: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut iter = input.split_whitespace();
    
    let n: usize = iter.next().unwrap().parse().unwrap();
    let mut a: Vec<i64> = iter.map(|s| s.parse().unwrap()).collect();
    
    let mut best = a[0];
    let mut cur = a[0];
    
    for i in 1..n {
        cur = a[i].max(cur + a[i]);
        best = best.max(cur);
    }
    
    println!("{}", best);
}`,
  },
];