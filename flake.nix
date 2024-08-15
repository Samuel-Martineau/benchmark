{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs =
    { nixpkgs, ... }:
    {
      devShells =
        nixpkgs.lib.genAttrs
          [
            "x86_64-linux"
            "aarch64-linux"
            "x86_64-darwin"
            "aarch64-darwin"
          ]
          (
            system:
            let
              pkgs = nixpkgs.legacyPackages.${system};
            in
              {
                default = pkgs.mkShell {
                  packages = with pkgs; [
                    nodejs
                    nodePackages.pnpm
                    nodePackages.svelte-language-server
                    nodePackages.typescript-language-server
                    postgresql
                  ];
                };
              }
          );
    };
}
