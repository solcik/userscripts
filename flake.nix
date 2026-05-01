{
  description = "Userscripts dev environment (bun + oxc)";

  inputs = {
    unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
    pre-commit-hooks = {
      url = "github:cachix/pre-commit-hooks.nix";
      inputs.nixpkgs.follows = "unstable";
    };
  };

  outputs = {
    unstable,
    flake-utils,
    pre-commit-hooks,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = unstable.legacyPackages.${system};
        pre-commit-check = pre-commit-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            oxlint = {
              enable = true;
              name = "oxlint";
              entry = "bun run lint";
              files = "\\.(js|jsx|ts|tsx)$";
              pass_filenames = false;
              language = "system";
            };

            oxfmt = {
              enable = true;
              name = "oxfmt";
              entry = "bun run format";
              files = "\\.(js|jsx|ts|tsx|json|jsonc)$";
              pass_filenames = false;
              language = "system";
            };
          };
          excludes = ["^node_modules/" "^\\.direnv/" "^\\.git/"];
        };
      in {
        checks = {
          inherit pre-commit-check;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            nodejs_24
          ];
          shellHook = ''
            ${pre-commit-check.shellHook}
          '';
        };
      }
    );
}
