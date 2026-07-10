import type { LanguageBuiltins } from "@/types/completion";

/**
 * CompletionItemKind numeric values (Monaco enum):
 * 14=Constant (keywords), 1=Function (built-in functions), 5=Class, 6=Struct
 */

const Kind = {
  Keyword: 14,
  Function: 1,
  Class: 5,
  Struct: 6,
  Snippet: 17,
} as const;

/**
 * C/C++ built-in completions: keywords, STL, and competitive programming snippets.
 */
export const CPP_BUILTINS: LanguageBuiltins = {
  keywords: [
    // Control flow
    { label: "if", kind: Kind.Keyword, insertText: "if () {\n  \n}", detail: "if statement" },
    { label: "else", kind: Kind.Keyword, insertText: "else {\n  \n}", detail: "else clause" },
    { label: "else if", kind: Kind.Keyword, insertText: "else if () {\n  \n}", detail: "else-if clause" },
    { label: "for", kind: Kind.Keyword, insertText: "for (int i = 0; i < n; i++) {\n  \n}", detail: "for loop" },
    { label: "while", kind: Kind.Keyword, insertText: "while () {\n  \n}", detail: "while loop" },
    { label: "do", kind: Kind.Keyword, insertText: "do {\n  \n} while ();", detail: "do-while loop" },
    { label: "switch", kind: Kind.Keyword, insertText: "switch () {\n  case : break;\n  default: break;\n}", detail: "switch statement" },
    { label: "case", kind: Kind.Keyword, insertText: "case : break;", detail: "case label" },
    { label: "break", kind: Kind.Keyword, insertText: "break;", detail: "break statement" },
    { label: "continue", kind: Kind.Keyword, insertText: "continue;", detail: "continue statement" },
    { label: "return", kind: Kind.Keyword, insertText: "return ;", detail: "return statement" },
    { label: "goto", kind: Kind.Keyword, insertText: "goto ;", detail: "goto statement" },

    // Storage & modifiers
    { label: "int", kind: Kind.Keyword, insertText: "int", detail: "integer type" },
    { label: "long", kind: Kind.Keyword, insertText: "long", detail: "long type" },
    { label: "long long", kind: Kind.Keyword, insertText: "long long", detail: "long long type" },
    { label: "unsigned", kind: Kind.Keyword, insertText: "unsigned", detail: "unsigned modifier" },
    { label: "signed", kind: Kind.Keyword, insertText: "signed", detail: "signed modifier" },
    { label: "short", kind: Kind.Keyword, insertText: "short", detail: "short type" },
    { label: "char", kind: Kind.Keyword, insertText: "char", detail: "character type" },
    { label: "bool", kind: Kind.Keyword, insertText: "bool", detail: "boolean type" },
    { label: "float", kind: Kind.Keyword, insertText: "float", detail: "float type" },
    { label: "double", kind: Kind.Keyword, insertText: "double", detail: "double type" },
    { label: "void", kind: Kind.Keyword, insertText: "void", detail: "void type" },
    { label: "auto", kind: Kind.Keyword, insertText: "auto", detail: "auto type deduction" },
    { label: "const", kind: Kind.Keyword, insertText: "const", detail: "const qualifier" },
    { label: "static", kind: Kind.Keyword, insertText: "static", detail: "static specifier" },
    { label: "extern", kind: Kind.Keyword, insertText: "extern", detail: "extern specifier" },
    { label: "register", kind: Kind.Keyword, insertText: "register", detail: "register specifier" },
    { label: "volatile", kind: Kind.Keyword, insertText: "volatile", detail: "volatile qualifier" },
    { label: "mutable", kind: Kind.Keyword, insertText: "mutable", detail: "mutable specifier" },
    { label: "constexpr", kind: Kind.Keyword, insertText: "constexpr", detail: "constexpr specifier" },

    // Type definitions
    { label: "typedef", kind: Kind.Keyword, insertText: "typedef  ;", detail: "typedef" },
    { label: "using", kind: Kind.Keyword, insertText: "using namespace ;", detail: "using directive" },
    { label: "namespace", kind: Kind.Keyword, insertText: "namespace  {\n  \n}", detail: "namespace" },
    { label: "struct", kind: Kind.Keyword, insertText: "struct  {\n  \n};", detail: "struct definition" },
    { label: "class", kind: Kind.Keyword, insertText: "class  {\npublic:\n  \n};", detail: "class definition" },
    { label: "enum", kind: Kind.Keyword, insertText: "enum  { };", detail: "enum definition" },
    { label: "union", kind: Kind.Keyword, insertText: "union  {\n  \n};", detail: "union definition" },
    { label: "template", kind: Kind.Keyword, insertText: "template<typename T>\n", detail: "template declaration" },
    { label: "typename", kind: Kind.Keyword, insertText: "typename", detail: "typename keyword" },

    // C++11/14/17/20
    { label: "nullptr", kind: Kind.Keyword, insertText: "nullptr", detail: "null pointer" },
    { label: "override", kind: Kind.Keyword, insertText: "override", detail: "override specifier" },
    { label: "final", kind: Kind.Keyword, insertText: "final", detail: "final specifier" },
    { label: "virtual", kind: Kind.Keyword, insertText: "virtual", detail: "virtual specifier" },
    { label: "explicit", kind: Kind.Keyword, insertText: "explicit", detail: "explicit specifier" },
    { label: "friend", kind: Kind.Keyword, insertText: "friend", detail: "friend specifier" },
    { label: "inline", kind: Kind.Keyword, insertText: "inline", detail: "inline specifier" },
    { label: "noexcept", kind: Kind.Keyword, insertText: "noexcept", detail: "noexcept specifier" },
    { label: "decltype", kind: Kind.Keyword, insertText: "decltype()", detail: "decltype specifier" },
    { label: "static_assert", kind: Kind.Keyword, insertText: "static_assert();", detail: "static assertion" },

    // Access specifiers
    { label: "public", kind: Kind.Keyword, insertText: "public:", detail: "public access" },
    { label: "private", kind: Kind.Keyword, insertText: "private:", detail: "private access" },
    { label: "protected", kind: Kind.Keyword, insertText: "protected:", detail: "protected access" },

    // Exception handling
    { label: "try", kind: Kind.Keyword, insertText: "try {\n  \n} catch () {\n  \n}", detail: "try block" },
    { label: "catch", kind: Kind.Keyword, insertText: "catch () {\n  \n}", detail: "catch block" },
    { label: "throw", kind: Kind.Keyword, insertText: "throw ;", detail: "throw expression" },

    // Common typedefs
    { label: "size_t", kind: Kind.Keyword, insertText: "size_t", detail: "unsigned integer type" },
    { label: "int64_t", kind: Kind.Keyword, insertText: "int64_t", detail: "64-bit signed integer" },
    { label: "uint64_t", kind: Kind.Keyword, insertText: "uint64_t", detail: "64-bit unsigned integer" },
    { label: "int32_t", kind: Kind.Keyword, insertText: "int32_t", detail: "32-bit signed integer" },
    { label: "uint32_t", kind: Kind.Keyword, insertText: "uint32_t", detail: "32-bit unsigned integer" },
    { label: "string", kind: Kind.Keyword, insertText: "string", detail: "std::string" },
  ],

  types: [
    // STL Containers
    { label: "vector", kind: Kind.Class, insertText: "vector", detail: "std::vector<T> dynamic array" },
    { label: "map", kind: Kind.Class, insertText: "map", detail: "std::map<K,V> ordered map" },
    { label: "unordered_map", kind: Kind.Class, insertText: "unordered_map", detail: "std::unordered_map<K,V> hash map" },
    { label: "set", kind: Kind.Class, insertText: "set", detail: "std::set<T> ordered set" },
    { label: "unordered_set", kind: Kind.Class, insertText: "unordered_set", detail: "std::unordered_set<T> hash set" },
    { label: "multiset", kind: Kind.Class, insertText: "multiset", detail: "std::multiset<T>" },
    { label: "multimap", kind: Kind.Class, insertText: "multimap", detail: "std::multimap<K,V>" },
    { label: "stack", kind: Kind.Class, insertText: "stack", detail: "std::stack<T> LIFO stack" },
    { label: "queue", kind: Kind.Class, insertText: "queue", detail: "std::queue<T> FIFO queue" },
    { label: "deque", kind: Kind.Class, insertText: "deque", detail: "std::deque<T> double-ended queue" },
    { label: "priority_queue", kind: Kind.Class, insertText: "priority_queue", detail: "std::priority_queue<T> max-heap" },
    { label: "list", kind: Kind.Class, insertText: "list", detail: "std::list<T> doubly-linked list" },
    { label: "forward_list", kind: Kind.Class, insertText: "forward_list", detail: "std::forward_list<T> singly-linked list" },
    { label: "pair", kind: Kind.Struct, insertText: "pair", detail: "std::pair<T1,T2>" },
    { label: "tuple", kind: Kind.Class, insertText: "tuple", detail: "std::tuple<Args...>" },
    { label: "optional", kind: Kind.Class, insertText: "optional", detail: "std::optional<T>" },
    { label: "variant", kind: Kind.Class, insertText: "variant", detail: "std::variant<Types...>" },
    { label: "any", kind: Kind.Class, insertText: "any", detail: "std::any" },
    { label: "bitset", kind: Kind.Class, insertText: "bitset", detail: "std::bitset<N>" },
    { label: "string_view", kind: Kind.Class, insertText: "string_view", detail: "std::string_view" },
    { label: "array", kind: Kind.Class, insertText: "array", detail: "std::array<T,N>" },
    { label: "valarray", kind: Kind.Class, insertText: "valarray", detail: "std::valarray<T>" },
    { label: "initializer_list", kind: Kind.Class, insertText: "initializer_list", detail: "std::initializer_list<T>" },
    { label: "complex", kind: Kind.Class, insertText: "complex", detail: "std::complex<T>" },
    { label: "span", kind: Kind.Class, insertText: "span", detail: "std::span<T>" },

    // Smart pointers
    { label: "unique_ptr", kind: Kind.Class, insertText: "unique_ptr", detail: "std::unique_ptr<T>" },
    { label: "shared_ptr", kind: Kind.Class, insertText: "shared_ptr", detail: "std::shared_ptr<T>" },
    { label: "weak_ptr", kind: Kind.Class, insertText: "weak_ptr", detail: "std::weak_ptr<T>" },

    // IO
    { label: "istream", kind: Kind.Class, insertText: "istream", detail: "std::istream" },
    { label: "ostream", kind: Kind.Class, insertText: "ostream", detail: "std::ostream" },
    { label: "ifstream", kind: Kind.Class, insertText: "ifstream", detail: "std::ifstream" },
    { label: "ofstream", kind: Kind.Class, insertText: "ofstream", detail: "std::ofstream" },
    { label: "stringstream", kind: Kind.Class, insertText: "stringstream", detail: "std::stringstream" },
    { label: "istringstream", kind: Kind.Class, insertText: "istringstream", detail: "std::istringstream" },
    { label: "ostringstream", kind: Kind.Class, insertText: "ostringstream", detail: "std::ostringstream" },

    // Iterators
    { label: "iterator", kind: Kind.Class, insertText: "iterator", detail: "std::iterator" },
    { label: "reverse_iterator", kind: Kind.Class, insertText: "reverse_iterator", detail: "std::reverse_iterator" },
    { label: "back_insert_iterator", kind: Kind.Class, insertText: "back_insert_iterator", detail: "std::back_insert_iterator" },
    { label: "front_insert_iterator", kind: Kind.Class, insertText: "front_insert_iterator", detail: "std::front_insert_iterator" },
    { label: "insert_iterator", kind: Kind.Class, insertText: "insert_iterator", detail: "std::insert_iterator" },

    // Functional
    { label: "function", kind: Kind.Class, insertText: "function", detail: "std::function<ReturnType(Args...)>" },
    { label: "bind", kind: Kind.Function, insertText: "bind", detail: "std::bind" },
    { label: "ref", kind: Kind.Function, insertText: "ref", detail: "std::ref" },
    { label: "cref", kind: Kind.Function, insertText: "cref", detail: "std::cref" },

    // Chrono
    { label: "chrono", kind: Kind.Class, insertText: "chrono", detail: "std::chrono namespace" },
    { label: "duration", kind: Kind.Class, insertText: "duration", detail: "std::chrono::duration" },
    { label: "time_point", kind: Kind.Class, insertText: "time_point", detail: "std::chrono::time_point" },
  ],

  functions: [
    // I/O
    { label: "cin", kind: Kind.Function, insertText: "cin >> ", detail: "std::cin input stream" },
    { label: "cout", kind: Kind.Function, insertText: "cout << ", detail: "std::cout output stream" },
    { label: "cerr", kind: Kind.Function, insertText: "cerr << ", detail: "std::cerr error stream" },
    { label: "endl", kind: Kind.Function, insertText: "endl", detail: "std::endl newline + flush" },
    { label: "flush", kind: Kind.Function, insertText: "flush", detail: "std::flush output flush" },
    { label: "getline", kind: Kind.Function, insertText: "getline(cin, )", detail: "std::getline read line" },

    // Algorithm
    { label: "sort", kind: Kind.Function, insertText: "sort(all(v))", detail: "std::sort" },
    { label: "stable_sort", kind: Kind.Function, insertText: "stable_sort(all(v))", detail: "std::stable_sort" },
    { label: "partial_sort", kind: Kind.Function, insertText: "partial_sort(all(v))", detail: "std::partial_sort" },
    { label: "nth_element", kind: Kind.Function, insertText: "nth_element(all(v))", detail: "std::nth_element" },
    { label: "reverse", kind: Kind.Function, insertText: "reverse(all(v))", detail: "std::reverse" },
    { label: "rotate", kind: Kind.Function, insertText: "rotate(all(v))", detail: "std::rotate" },
    { label: "shuffle", kind: Kind.Function, insertText: "shuffle(all(v), rng)", detail: "std::shuffle" },
    { label: "next_permutation", kind: Kind.Function, insertText: "next_permutation(all(v))", detail: "std::next_permutation" },
    { label: "prev_permutation", kind: Kind.Function, insertText: "prev_permutation(all(v))", detail: "std::prev_permutation" },
    { label: "unique", kind: Kind.Function, insertText: "unique(all(v))", detail: "std::unique" },
    { label: "lower_bound", kind: Kind.Function, insertText: "lower_bound(all(v), val)", detail: "std::lower_bound" },
    { label: "upper_bound", kind: Kind.Function, insertText: "upper_bound(all(v), val)", detail: "std::upper_bound" },
    { label: "binary_search", kind: Kind.Function, insertText: "binary_search(all(v), val)", detail: "std::binary_search" },
    { label: "equal_range", kind: Kind.Function, insertText: "equal_range(all(v), val)", detail: "std::equal_range" },
    { label: "merge", kind: Kind.Function, insertText: "merge(v1, v2, back_inserter(v3))", detail: "std::merge" },
    { label: "inplace_merge", kind: Kind.Function, insertText: "inplace_merge(all(v))", detail: "std::inplace_merge" },
    { label: "includes", kind: Kind.Function, insertText: "includes(all(v1), all(v2))", detail: "std::includes" },
    { label: "set_union", kind: Kind.Function, insertText: "set_union(all(v1), all(v2), back_inserter(v3))", detail: "std::set_union" },
    { label: "set_intersection", kind: Kind.Function, insertText: "set_intersection(all(v1), all(v2), back_inserter(v3))", detail: "std::set_intersection" },
    { label: "set_difference", kind: Kind.Function, insertText: "set_difference(all(v1), all(v2), back_inserter(v3))", detail: "std::set_difference" },
    { label: "set_symmetric_difference", kind: Kind.Function, insertText: "set_symmetric_difference(all(v1), all(v2), back_inserter(v3))", detail: "std::set_symmetric_difference" },
    { label: "min", kind: Kind.Function, insertText: "min(a, b)", detail: "std::min" },
    { label: "max", kind: Kind.Function, insertText: "max(a, b)", detail: "std::max" },
    { label: "minmax", kind: Kind.Function, insertText: "minmax(a, b)", detail: "std::minmax" },
    { label: "min_element", kind: Kind.Function, insertText: "min_element(all(v))", detail: "std::min_element" },
    { label: "max_element", kind: Kind.Function, insertText: "max_element(all(v))", detail: "std::max_element" },
    { label: "minmax_element", kind: Kind.Function, insertText: "minmax_element(all(v))", detail: "std::minmax_element" },
    { label: "accumulate", kind: Kind.Function, insertText: "accumulate(all(v), 0LL)", detail: "std::accumulate (numeric)" },
    { label: "partial_sum", kind: Kind.Function, insertText: "partial_sum(all(v), back_inserter(res))", detail: "std::partial_sum" },
    { label: "adjacent_difference", kind: Kind.Function, insertText: "adjacent_difference(all(v), back_inserter(res))", detail: "std::adjacent_difference" },
    { label: "iota", kind: Kind.Function, insertText: "iota(all(v), 0)", detail: "std::iota" },
    { label: "inner_product", kind: Kind.Function, insertText: "inner_product(all(v1), v2.begin(), 0))", detail: "std::inner_product" },
    { label: "count", kind: Kind.Function, insertText: "count(all(v), val)", detail: "std::count" },
    { label: "count_if", kind: Kind.Function, insertText: "count_if(all(v), pred)", detail: "std::count_if" },
    { label: "find", kind: Kind.Function, insertText: "find(all(v), val)", detail: "std::find" },
    { label: "find_if", kind: Kind.Function, insertText: "find_if(all(v), pred)", detail: "std::find_if" },
    { label: "find_if_not", kind: Kind.Function, insertText: "find_if_not(all(v), pred)", detail: "std::find_if_not" },
    { label: "for_each", kind: Kind.Function, insertText: "for_each(all(v), fn)", detail: "std::for_each" },
    { label: "transform", kind: Kind.Function, insertText: "transform(all(v), back_inserter(res), fn)", detail: "std::transform" },
    { label: "copy", kind: Kind.Function, insertText: "copy(all(v), back_inserter(res))", detail: "std::copy" },
    { label: "copy_if", kind: Kind.Function, insertText: "copy_if(all(v), back_inserter(res), pred)", detail: "std::copy_if" },
    { label: "replace", kind: Kind.Function, insertText: "replace(all(v), old, new)", detail: "std::replace" },
    { label: "replace_if", kind: Kind.Function, insertText: "replace_if(all(v), pred, val)", detail: "std::replace_if" },
    { label: "fill", kind: Kind.Function, insertText: "fill(all(v), val)", detail: "std::fill" },
    { label: "fill_n", kind: Kind.Function, insertText: "fill_n(ptr, n, val)", detail: "std::fill_n" },
    { label: "generate", kind: Kind.Function, insertText: "generate(all(v), gen)", detail: "std::generate" },
    { label: "generate_n", kind: Kind.Function, insertText: "generate_n(ptr, n, gen)", detail: "std::generate_n" },
    { label: "remove", kind: Kind.Function, insertText: "remove(all(v), val)", detail: "std::remove" },
    { label: "remove_if", kind: Kind.Function, insertText: "remove_if(all(v), pred)", detail: "std::remove_if" },
    { label: "replace_copy", kind: Kind.Function, insertText: "replace_copy(all(v), back_inserter(res), old, new)", detail: "std::replace_copy" },
    { label: "partition", kind: Kind.Function, insertText: "partition(all(v), pred)", detail: "std::partition" },
    { label: "stable_partition", kind: Kind.Function, insertText: "stable_partition(all(v), pred)", detail: "std::stable_partition" },
    { label: "partition_point", kind: Kind.Function, insertText: "partition_point(all(v), pred)", detail: "std::partition_point" },
    { label: "is_sorted", kind: Kind.Function, insertText: "is_sorted(all(v))", detail: "std::is_sorted" },
    { label: "is_sorted_until", kind: Kind.Function, insertText: "is_sorted_until(all(v))", detail: "std::is_sorted_until" },
    { label: "is_permutation", kind: Kind.Function, insertText: "is_permutation(all(v1), v2.begin())", detail: "std::is_permutation" },
    { label: "all_of", kind: Kind.Function, insertText: "all_of(all(v), pred)", detail: "std::all_of" },
    { label: "any_of", kind: Kind.Function, insertText: "any_of(all(v), pred)", detail: "std::any_of" },
    { label: "none_of", kind: Kind.Function, insertText: "none_of(all(v), pred)", detail: "std::none_of" },
    { label: "adjacent_find", kind: Kind.Function, insertText: "adjacent_find(all(v))", detail: "std::adjacent_find" },
    { label: "mismatch", kind: Kind.Function, insertText: "mismatch(all(v1), v2.begin())", detail: "std::mismatch" },
    { label: "equal", kind: Kind.Function, insertText: "equal(all(v1), v2.begin())", detail: "std::equal" },
    { label: "lexicographical_compare", kind: Kind.Function, insertText: "lexicographical_compare(all(v1), all(v2))", detail: "std::lexicographical_compare" },
    { label: "clamp", kind: Kind.Function, insertText: "clamp(val, lo, hi)", detail: "std::clamp (C++17)" },
    { label: "gcd", kind: Kind.Function, insertText: "gcd(a, b)", detail: "std::gcd (C++17, numeric)" },
    { label: "lcm", kind: Kind.Function, insertText: "lcm(a, b)", detail: "std::lcm (C++17, numeric)" },
    { label: "midpoint", kind: Kind.Function, insertText: "midpoint(a, b)", detail: "std::midpoint (C++20)" },

    // Math
    { label: "abs", kind: Kind.Function, insertText: "abs(x)", detail: "std::abs" },
    { label: "sqrt", kind: Kind.Function, insertText: "sqrt(x)", detail: "std::sqrt" },
    { label: "pow", kind: Kind.Function, insertText: "pow(x, y)", detail: "std::pow" },
    { label: "floor", kind: Kind.Function, insertText: "floor(x)", detail: "std::floor" },
    { label: "ceil", kind: Kind.Function, insertText: "ceil(x)", detail: "std::ceil" },
    { label: "round", kind: Kind.Function, insertText: "round(x)", detail: "std::round" },
    { label: "log", kind: Kind.Function, insertText: "log(x)", detail: "std::log" },
    { label: "log2", kind: Kind.Function, insertText: "log2(x)", detail: "std::log2" },
    { label: "log10", kind: Kind.Function, insertText: "log10(x)", detail: "std::log10" },
    { label: "sin", kind: Kind.Function, insertText: "sin(x)", detail: "std::sin" },
    { label: "cos", kind: Kind.Function, insertText: "cos(x)", detail: "std::cos" },
    { label: "tan", kind: Kind.Function, insertText: "tan(x)", detail: "std::tan" },
    { label: "asin", kind: Kind.Function, insertText: "asin(x)", detail: "std::asin" },
    { label: "acos", kind: Kind.Function, insertText: "acos(x)", detail: "std::acos" },
    { label: "atan", kind: Kind.Function, insertText: "atan(x)", detail: "std::atan" },
    { label: "atan2", kind: Kind.Function, insertText: "atan2(y, x)", detail: "std::atan2" },
    { label: "hypot", kind: Kind.Function, insertText: "hypot(x, y)", detail: "std::hypot" },

    // String
    { label: "to_string", kind: Kind.Function, insertText: "to_string(val)", detail: "std::to_string" },
    { label: "stoi", kind: Kind.Function, insertText: "stoi(s)", detail: "std::stoi string to int" },
    { label: "stol", kind: Kind.Function, insertText: "stol(s)", detail: "std::stol string to long" },
    { label: "stoll", kind: Kind.Function, insertText: "stoll(s)", detail: "std::stoll string to long long" },
    { label: "stof", kind: Kind.Function, insertText: "stof(s)", detail: "std::stof string to float" },
    { label: "stod", kind: Kind.Function, insertText: "stod(s)", detail: "std::stod string to double" },
    { label: "stold", kind: Kind.Function, insertText: "stold(s)", detail: "std::stold string to long double" },
    { label: "to_upper", kind: Kind.Function, insertText: "to_upper(s)", detail: "std::toupper (transform)" },
    { label: "to_lower", kind: Kind.Function, insertText: "to_lower(s)", detail: "std::tolower (transform)" },

    // Vector methods
    { label: "push_back", kind: Kind.Function, insertText: "push_back()", detail: "vector::push_back" },
    { label: "pop_back", kind: Kind.Function, insertText: "pop_back()", detail: "vector::pop_back" },
    { label: "size", kind: Kind.Function, insertText: "size()", detail: "container::size" },
    { label: "empty", kind: Kind.Function, insertText: "empty()", detail: "container::empty" },
    { label: "clear", kind: Kind.Function, insertText: "clear()", detail: "container::clear" },
    { label: "reserve", kind: Kind.Function, insertText: "reserve()", detail: "container::reserve" },
    { label: "resize", kind: Kind.Function, insertText: "resize()", detail: "container::resize" },
    { label: "begin", kind: Kind.Function, insertText: "begin()", detail: "container::begin" },
    { label: "end", kind: Kind.Function, insertText: "end()", detail: "container::end" },
    { label: "rbegin", kind: Kind.Function, insertText: "rbegin()", detail: "container::rbegin" },
    { label: "rend", kind: Kind.Function, insertText: "rend()", detail: "container::rend" },
    { label: "front", kind: Kind.Function, insertText: "front()", detail: "container::front" },
    { label: "back", kind: Kind.Function, insertText: "back()", detail: "container::back" },
    { label: "data", kind: Kind.Function, insertText: "data()", detail: "vector::data" },
    { label: "insert", kind: Kind.Function, insertText: "insert()", detail: "container::insert" },
    { label: "erase", kind: Kind.Function, insertText: "erase()", detail: "container::erase" },
    { label: "swap", kind: Kind.Function, insertText: "swap(a, b)", detail: "std::swap" },

    // Map/Set methods
    { label: "count", kind: Kind.Function, insertText: "count(key)", detail: "map/set::count" },
    { label: "find", kind: Kind.Function, insertText: "find(key)", detail: "map/set::find" },
    { label: "lower_bound", kind: Kind.Function, insertText: "lower_bound(key)", detail: "map/set::lower_bound" },
    { label: "upper_bound", kind: Kind.Function, insertText: "upper_bound(key)", detail: "map/set::upper_bound" },
    { label: "equal_range", kind: Kind.Function, insertText: "equal_range(key)", detail: "map/set::equal_range" },
    { label: "insert", kind: Kind.Function, insertText: "insert({key, val})", detail: "map::insert" },
    { label: "emplace", kind: Kind.Function, insertText: "emplace(args)", detail: "container::emplace" },
    { label: "emplace_back", kind: Kind.Function, insertText: "emplace_back(args)", detail: "container::emplace_back" },
    { label: "try_emplace", kind: Kind.Function, insertText: "try_emplace(key, args)", detail: "map::try_emplace" },
    { label: "insert_or_assign", kind: Kind.Function, insertText: "insert_or_assign(key, val)", detail: "map::insert_or_assign" },
    { label: "contains", kind: Kind.Function, insertText: "contains(key)", detail: "container::contains (C++20)" },

    // Stack/Queue
    { label: "push", kind: Kind.Function, insertText: "push()", detail: "stack/queue::push" },
    { label: "pop", kind: Kind.Function, insertText: "pop()", detail: "stack/queue::pop" },
    { label: "top", kind: Kind.Function, insertText: "top()", detail: "stack::top" },

    // Priority queue
    { label: "emplace", kind: Kind.Function, insertText: "emplace(args)", detail: "pq::emplace" },
  ],

  snippets: [
    {
      label: "solve_func",
      kind: Kind.Snippet,
      insertText:
        "void solve() {\n    ${1}\n}",
      detail: "Competitive programming solve() function",
    },
    {
      label: "main_func",
      kind: Kind.Snippet,
      insertText:
        "signed main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    int t = 1;\n    cin >> t;\n    while (t--) {\n        solve();\n    }\n    return 0;\n}",
      detail: "CP main() with fast I/O and test cases",
    },
    {
      label: "debug",
      kind: Kind.Snippet,
      insertText: "#ifdef LOCAL\n#define dbg(x) cerr << #x << \" = \" << (x) << endl;\n#else\n#define dbg(x)\n#endif",
      detail: "Debug macro",
    },
    {
      label: "fast_io",
      kind: Kind.Snippet,
      insertText: "ios::sync_with_stdio(false);\ncin.tie(nullptr);\ncout.tie(nullptr);",
      detail: "Fast I/O boilerplate",
    },
    {
      label: "rng",
      kind: Kind.Snippet,
      insertText:
        "mt19937 rng(chrono::steady_clock::now().time_since_epoch().count());",
      detail: "Random number generator",
    },
    {
      label: "read_vector",
      kind: Kind.Snippet,
      insertText:
        "vector<int> a(n);\nfor (auto &x : a) cin >> x;",
      detail: "Read vector of ints of size n",
    },
    {
      label: "all_macro",
      kind: Kind.Snippet,
      insertText: "#define all(x) (x).begin(), (x).end()",
      detail: "all(x) macro for convenience",
    },
    {
      label: "templates",
      kind: Kind.Snippet,
      insertText:
        "#include <bits/stdc++.h>\nusing namespace std;\n\n#define all(x) (x).begin(), (x).end()\n#define int long long\n\nvoid solve() {\n    ${1}\n}\n\nsigned main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    int t = 1;\n    cin >> t;\n    while (t--) {\n        solve();\n    }\n    return 0;\n}",
      detail: "Complete CP template (C++)",
    },
  ],
};