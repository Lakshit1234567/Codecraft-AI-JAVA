import { ProgrammingLanguage } from '../../../types';

export const DEFAULT_PROBLEM_DESCRIPTION =
  'Given an array of integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nConstraints: 1 <= n <= 20000, 0 <= height[i] <= 10^5';

export const LANGUAGE_TEMPLATES: Record<ProgrammingLanguage, string> = {
  CPP: `// C++17 Solution
#include <iostream>
#include <vector>
using namespace std;

int trap(vector<int>& height) {
    int n = height.size();
    if (n <= 2) return 0;
    int l = 0, r = n - 1;
    int lMax = 0, rMax = 0, total = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            if (height[l] >= lMax) lMax = height[l];
            else total += lMax - height[l];
            l++;
        } else {
            if (height[r] >= rMax) rMax = height[r];
            else total += rMax - height[r];
            r--;
        }
    }
    return total;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    cout << trap(arr) << endl;
    return 0;
}`,
  PYTHON: `# Python 3 Solution
import sys

def trap(height):
    n = len(height)
    if n <= 2:
        return 0
    l, r = 0, n - 1
    l_max = r_max = total = 0
    while l < r:
        if height[l] < height[r]:
            if height[l] >= l_max:
                l_max = height[l]
            else:
                total += l_max - height[l]
            l += 1
        else:
            if height[r] >= r_max:
                r_max = height[r]
            else:
                total += r_max - height[r]
            r -= 1
    return total

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = list(map(int, data[1:n + 1]))
    print(trap(arr))

if __name__ == "__main__":
    main()`,
  JAVA: `// Java 21 Solution
import java.util.*;

public class Main {
    public static int trap(int[] height) {
        int n = height.length;
        if (n <= 2) return 0;
        int l = 0, r = n - 1;
        int lMax = 0, rMax = 0, total = 0;
        while (l < r) {
            if (height[l] < height[r]) {
                if (height[l] >= lMax) lMax = height[l];
                else total += lMax - height[l];
                l++;
            } else {
                if (height[r] >= rMax) rMax = height[r];
                else total += rMax - height[r];
                r--;
            }
        }
        return total;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        System.out.println(trap(arr));
    }
}`,
};
